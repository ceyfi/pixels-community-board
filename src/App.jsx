import { useState, useEffect, useCallback } from 'react'
import { supabase, hasBackend } from './supabase.js'
import { DEMO_SUGGESTIONS } from './demoData.js'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'qol', label: 'Quality of Life' },
  { id: 'content', label: 'New Content' },
  { id: 'economy', label: 'Economy' },
  { id: 'bug', label: 'Bugs' },
  { id: 'other', label: 'Other' },
]

const STATUSES = {
  new: { label: 'New', cls: 'st-new' },
  considering: { label: 'Considering', cls: 'st-considering' },
  planned: { label: 'Planned', cls: 'st-planned' },
  done: { label: 'Done', cls: 'st-done' },
  declined: { label: 'Declined', cls: 'st-declined' },
}

export default function App() {
  const [suggestions, setSuggestions] = useState([])
  const [myVotes, setMyVotes] = useState(new Set())
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('top')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [emailSent, setEmailSent] = useState('')

  // ---------- auth ----------
  useEffect(() => {
    if (!hasBackend) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (s) setShowLogin(false) })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!hasBackend || !session) { setIsAdmin(false); return }
    supabase.from('app_admins').select('user_id').eq('user_id', session.user.id)
      .then(({ data }) => setIsAdmin(!!data && data.length > 0))
  }, [session])

  const requireLogin = () => {
    if (!hasBackend) { setError('Demo mode — sign-in works once Supabase is connected.'); return false }
    if (!session) { setEmailSent(''); setShowLogin(true); return false }
    return true
  }
  const signInDiscord = () => {
    if (!hasBackend) { setError('Demo mode — Discord login works once Supabase is connected.'); return }
    supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin + window.location.pathname } })
  }
  async function signInEmail(e) {
    e.preventDefault()
    const email = String(new FormData(e.target).get('email') || '').trim()
    if (!email) return
    const { error: err } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (err) setError('Email login failed: ' + err.message)
    else setEmailSent(email)
  }
  const signOut = () => supabase.auth.signOut()

  const displayName = session?.user?.user_metadata?.full_name
    || session?.user?.user_metadata?.name || null

  // ---------- data ----------
  const load = useCallback(async () => {
    setLoading(true)
    if (!hasBackend) {
      setSuggestions([...DEMO_SUGGESTIONS])
      setLoading(false)
      return
    }
    const { data, error: err } = await supabase
      .from('suggestions')
      .select('*')
      .order('votes_count', { ascending: false })
    if (err) setError(err.message)
    else setSuggestions(data || [])

    if (session) {
      const { data: votes } = await supabase
        .from('votes').select('suggestion_id').eq('voter_key', session.user.id)
      setMyVotes(new Set((votes || []).map(v => v.suggestion_id)))
    } else {
      setMyVotes(new Set())
    }
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  // ---------- actions ----------
  async function vote(s) {
    if (myVotes.has(s.id)) return
    if (hasBackend && !session) { requireLogin(); return }
    // optimistic
    setMyVotes(prev => new Set(prev).add(s.id))
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, votes_count: x.votes_count + 1 } : x))
    if (!hasBackend) return // demo: local only
    const { error: err } = await supabase.from('votes').insert({
      suggestion_id: s.id,
      voter_key: session.user.id,
      is_verified: true,
    })
    if (err && err.code !== '23505') { // ignore duplicate
      setError('Vote failed: ' + err.message)
      load()
    }
  }

  async function submit(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    const title = String(form.get('title') || '').trim()
    const description = String(form.get('description') || '').trim()
    const cat = String(form.get('category') || 'other')
    if (title.length < 8) { setError('Title too short (min 8 characters).'); return }
    const author = displayName || 'Anonymous farmer'
    if (!hasBackend) { // demo: local only
      setSuggestions(prev => [{
        id: 'local-' + Date.now(), created_at: new Date().toISOString(),
        title, description, category: cat, status: 'new',
        author_name: author, votes_count: 1,
      }, ...prev])
      setShowForm(false)
      return
    }
    const { error: err } = await supabase.from('suggestions').insert({
      title, description, category: cat,
      author_name: author,
      author_id: session?.user?.id || null,
    })
    if (err) { setError('Submit failed: ' + err.message); return }
    setShowForm(false)
    load()
  }

  async function setStatus(s, status) {
    const { error: err } = await supabase.from('suggestions').update({ status }).eq('id', s.id)
    if (err) setError('Status update failed: ' + err.message)
    else setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status } : x))
  }

  // ---------- view ----------
  let visible = suggestions.filter(s => category === 'all' || s.category === category)
  if (sort === 'new') visible = [...visible].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="wrap">
      {!hasBackend && (
        <div className="demobar">
          DEMO MODE — running on sample data, nothing is saved. Connect Supabase to go live (see README).
        </div>
      )}
      <header>
        <div>
          <h1>🌱 Pixels Community Board</h1>
          <p className="tag">Suggest it. Vote it. See what the community wants most.</p>
        </div>
        <div className="auth">
          {session ? (
            <>
              <span className="who">{displayName}{isAdmin ? ' · admin' : ''}</span>
              <button className="btn ghost" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <button className="btn primary" onClick={() => { setEmailSent(''); setShowLogin(true) }}>Sign in</button>
          )}
        </div>
      </header>

      <div className="toolbar">
        <div className="cats">
          {CATEGORIES.map(c => (
            <button key={c.id}
              className={'chip' + (category === c.id ? ' active' : '')}
              onClick={() => setCategory(c.id)}>{c.label}</button>
          ))}
        </div>
        <div className="right">
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="top">Top voted</option>
            <option value="new">Newest</option>
          </select>
          <button className="btn primary" onClick={() => { setError(''); if (hasBackend && !session) { requireLogin(); return } setShowForm(true) }}>
            + Share an idea
          </button>
        </div>
      </div>

      {error && <div className="error" onClick={() => setError('')}>{error} ✕</div>}

      {loading ? <p className="muted center">Loading…</p> : (
        <div className="list">
          {visible.length === 0 && <p className="muted center">No suggestions here yet. Be the first.</p>}
          {visible.map(s => {
            const st = STATUSES[s.status] || STATUSES.new
            const voted = myVotes.has(s.id)
            return (
              <div className="card" key={s.id}>
                <button className={'votebox' + (voted ? ' voted' : '')}
                  onClick={() => vote(s)} disabled={voted}
                  title={voted ? 'You already voted' : 'Upvote'}>
                  <span className="arrow">▲</span>
                  <span className="count">{s.votes_count}</span>
                </button>
                <div className="body">
                  <div className="titlerow">
                    <h3>{s.title}</h3>
                    <span className={'status ' + st.cls}>{st.label}</span>
                  </div>
                  {s.description && <p className="desc">{s.description}</p>}
                  <div className="meta">
                    <span className="cat">{(CATEGORIES.find(c => c.id === s.category) || {}).label || s.category}</span>
                    <span>by {s.author_name}</span>
                    <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    {isAdmin && (
                      <select value={s.status} onChange={e => setStatus(s, e.target.value)}>
                        {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
            <h2>Share an idea</h2>
            <label>Title</label>
            <input name="title" maxLength={120} placeholder="e.g. Permanent Infiniportable as a chase item" required />
            <label>Details (optional)</label>
            <textarea name="description" maxLength={2000} rows={4}
              placeholder="Why it matters, how it could work…" />
            <label>Category</label>
            <select name="category" defaultValue="qol">
              {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn primary">Submit</button>
            </div>
          </form>
        </div>
      )}

      {showLogin && (
        <div className="overlay" onClick={() => setShowLogin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Sign in to vote</h2>
            <p className="muted">Reading is open to everyone. To vote or suggest, sign in — one account, one vote per idea.</p>
            <button className="btn discord" style={{ width: '100%' }} onClick={signInDiscord}>Continue with Discord</button>
            <div style={{ textAlign: 'center', margin: '12px 0', opacity: 0.6 }}>or</div>
            {emailSent ? (
              <p className="muted">Check <b>{emailSent}</b> for a login link, then come back to this tab.</p>
            ) : (
              <form onSubmit={signInEmail}>
                <label>Email</label>
                <input name="email" type="email" placeholder="you@example.com" required />
                <div className="actions">
                  <button type="button" className="btn ghost" onClick={() => setShowLogin(false)}>Cancel</button>
                  <button type="submit" className="btn primary">Email me a link</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <footer>
        Community project by Ficey · not affiliated with the Pixels team ·
        sign in with Discord or email · one vote per idea per person
      </footer>
    </div>
  )
}
