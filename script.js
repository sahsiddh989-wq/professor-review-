const API_BASE = (window.PROFESSOR_REVIEW_API || '').replace(/\/$/, '');
const LOCAL_PROFESSORS = [
  { _id:'demo-1',name:'Dr. Jennifer Smith',course:'Data Structures',rating:4.8,reviews:245,tag:'Excellent',dept:'Computer Science',university:'IEC College of Engineering and Technology' },
  { _id:'demo-2',name:'Prof. Michael Brown',course:'Calculus I',rating:4.7,reviews:189,tag:'Clear',dept:'Mathematics',university:'Delhi University' },
  { _id:'demo-3',name:'Dr. Sarah Johnson',course:'Psychology 101',rating:4.6,reviews:210,tag:'Helpful',dept:'Psychology',university:'Delhi University' },
  { _id:'demo-4',name:'Prof. David Lee',course:'Economics',rating:4.5,reviews:162,tag:'Fair',dept:'Economics',university:'IEC College of Engineering and Technology' },
  { _id:'demo-5',name:'Dr. Emily Carter',course:'Operating Systems',rating:4.8,reviews:137,tag:'Engaging',dept:'Computer Science',university:'IEC College of Engineering and Technology' },
  { _id:'demo-6',name:'Prof. Daniel Wilson',course:'Statistics',rating:4.7,reviews:118,tag:'Supportive',dept:'Mathematics',university:'Delhi University' }
];
let professors = [...LOCAL_PROFESSORS];
let currentReviewProfessor = null;
const profGrid = document.getElementById('profGrid');
const directoryGrid = document.getElementById('directoryGrid');
const modal = document.getElementById('authModal');
const reviewModal = document.getElementById('reviewModal');
const authForm = document.getElementById('authForm');
const tokenKey = 'professor_review_token';
function initials(name) { return name.split(' ').filter(Boolean).slice(-2).map(x => x[0]).join('').toUpperCase(); }
function escapeHtml(value='') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
function card(p) { return `<article class="prof-card"><div class="prof-top"><div class="prof-photo">${escapeHtml(initials(p.name))}</div><div><h3>${escapeHtml(p.name)}</h3><small>${escapeHtml(p.course)}</small></div></div><div class="rating">★ ${Number(p.rating || 0).toFixed(1)} <span>(${Number(p.reviews || 0)} reviews)</span></div><span class="tag">${escapeHtml(p.tag || 'New')}</span><p class="prof-dept">${escapeHtml(p.dept || '')} Department</p><button class="btn btn-primary review-btn" data-id="${escapeHtml(p._id)}">View & Review</button></article>`; }
function render(list, el) { el.innerHTML = list.map(card).join('') || '<p class="empty-state">No professors found.</p>'; }
function getToken() { return localStorage.getItem(tokenKey); }
function getUser() { try { return JSON.parse(localStorage.getItem('professor_review_user') || 'null'); } catch { return null; } }
function setSession(data) { localStorage.setItem(tokenKey, data.token); localStorage.setItem('professor_review_user', JSON.stringify(data.user)); updateAuthUI(); }
function clearSession() { localStorage.removeItem(tokenKey); localStorage.removeItem('professor_review_user'); updateAuthUI(); }
function updateAuthUI() {
  const loginButton = document.querySelector('.nav-links [data-auth="login"], .nav-links [data-account="true"]');
  const signupButton = document.querySelector('.nav-links [data-auth="signup"], .nav-links [data-logout="true"]');
  if (!loginButton || !signupButton) return;
  const loggedIn = !!getToken();
  const user = getUser();
  if (loggedIn) {
    loginButton.textContent = user?.name ? `Hi, ${user.name.split(' ')[0]} 👋` : 'Account';
    loginButton.removeAttribute('data-auth'); loginButton.dataset.account = 'true';
    signupButton.textContent = 'Log Out'; signupButton.removeAttribute('data-auth'); signupButton.dataset.logout = 'true';
  } else {
    loginButton.textContent = 'Log In'; loginButton.removeAttribute('data-account'); loginButton.dataset.auth = 'login';
    signupButton.textContent = 'Sign Up'; signupButton.removeAttribute('data-logout'); signupButton.dataset.auth = 'signup';
  }
}
async function api(path, options={}) {
  if (!API_BASE) throw new Error('Backend URL is not configured yet.');
  const headers = { 'Content-Type':'application/json', ...(options.headers || {}) };
  const token = getToken(); if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}
async function loadProfessors(query='', minRating=0) {
  try { const data = await api(`/professors?q=${encodeURIComponent(query)}&minRating=${minRating}`); professors = data.professors; } catch {}
  render(professors.slice(0,4), profGrid); render(professors, directoryGrid);
}
render(professors.slice(0,4), profGrid); render(professors, directoryGrid); updateAuthUI(); loadProfessors();

document.addEventListener('click', e => {
  const logoutButton = e.target.closest('[data-logout="true"]');
  if (logoutButton) { e.preventDefault(); clearSession(); alert('You have been logged out.'); return; }
  const reviewButton = e.target.closest('.review-btn');
  if (reviewButton) { currentReviewProfessor = professors.find(p => String(p._id) === String(reviewButton.dataset.id)); if (currentReviewProfessor) { document.getElementById('reviewTitle').textContent = `Review ${currentReviewProfessor.name}`; openReviewModal(); } return; }
  const authButton = e.target.closest('[data-auth]');
  if (authButton) { e.preventDefault(); openAuth(authButton.dataset.auth); }
});
const menuBtn = document.getElementById('menuBtn'); const navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
function openAuth(mode='login') { modal.classList.add('open', mode === 'signup' ? 'signup' : 'login'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; document.getElementById('authSubmit').textContent = mode === 'signup' ? 'Sign Up' : 'Log In'; document.getElementById('switchAuth').innerHTML = mode === 'signup' ? 'Already have an account? <button type="button" data-auth="login">Log in</button>' : 'Don\'t have an account? <button type="button" data-auth="signup">Sign up</button>'; }
function closeAuth() { modal.classList.remove('open','signup','login'); modal.setAttribute('aria-hidden','true'); if (!reviewModal.classList.contains('open')) document.body.style.overflow=''; }
function openReviewModal() { reviewModal.classList.add('open'); reviewModal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
function closeReviewModal() { reviewModal.classList.remove('open'); reviewModal.setAttribute('aria-hidden','true'); if (!modal.classList.contains('open')) document.body.style.overflow=''; }
document.querySelectorAll('[data-close="modal"]').forEach(b => b.addEventListener('click', closeAuth));
document.querySelectorAll('[data-close="review"]').forEach(b => b.addEventListener('click', closeReviewModal));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAuth(); closeReviewModal(); } });
authForm.addEventListener('submit', async e => { e.preventDefault(); const signup = modal.classList.contains('signup'); const payload = { email: document.getElementById('email').value.trim(), password: document.getElementById('password').value }; if (signup) { payload.name = document.getElementById('fullName').value.trim(); payload.university = document.getElementById('university').value; if (payload.password !== document.getElementById('confirmPassword').value) return alert('Passwords do not match.'); } try { const data = await api(signup ? '/auth/register' : '/auth/login', { method:'POST', body:JSON.stringify(payload) }); setSession(data); alert(signup ? 'Account created successfully.' : 'Login successful.'); closeAuth(); } catch (error) { alert(error.message); } });
async function filterDirectory() { await loadProfessors(document.getElementById('directorySearch').value.trim(), Number(document.getElementById('ratingFilter').value)); }
document.getElementById('directorySearch').addEventListener('input', filterDirectory); document.getElementById('ratingFilter').addEventListener('change', filterDirectory);
document.getElementById('heroSearch').addEventListener('submit', async e => { e.preventDefault(); const q = document.getElementById('heroQuery').value.trim(); document.getElementById('directorySearch').value=q; document.getElementById('directory').scrollIntoView({behavior:'smooth'}); await filterDirectory(); });
document.querySelectorAll('.trending button,.course-card').forEach(b => b.addEventListener('click', () => { document.getElementById('heroQuery').value = b.dataset.course || b.textContent; document.getElementById('heroSearch').dispatchEvent(new Event('submit')); }));
document.getElementById('reviewForm').addEventListener('submit', async e => { e.preventDefault(); if (!getToken()) { closeReviewModal(); openAuth('login'); return; } try { await api('/reviews', { method:'POST', body:JSON.stringify({ professorId:currentReviewProfessor._id, rating:Number(document.getElementById('reviewRating').value), teachingQuality:Number(document.getElementById('teachingQuality').value), difficulty:Number(document.getElementById('difficulty').value), comment:document.getElementById('reviewComment').value.trim() }) }); alert('Review published successfully.'); document.getElementById('reviewForm').reset(); closeReviewModal(); await filterDirectory(); } catch (error) { alert(error.message); } });
document.getElementById('year').textContent = new Date().getFullYear();
