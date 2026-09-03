const API_BASE = (window.PROFESSOR_REVIEW_API || '').replace(/\/$/, '');
const TOKEN_KEY = 'professor_review_admin_token';
const USER_KEY = 'professor_review_admin_user';

let users = [];
let professors = [];
let reviews = [];

const $ = (id) => document.getElementById(id);
const getToken = () => localStorage.getItem(TOKEN_KEY);

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>\'"]/g, (char) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;'
    };
    return map[char] || char;
  });
}

function showLoginError(message) {
  const el = $('loginError');
  if (el) el.textContent = message || '';
}

function showMessage(message) {
  const el = $('message');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 2500);
}

async function api(path, options) {
  const opts = options || {};
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const currentToken = getToken();

  if (currentToken) headers.Authorization = `Bearer ${currentToken}`;

  const response = await fetch(`${API_BASE}${path}`, Object.assign({}, opts, { headers }));
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

function saveAdminUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function currentAdminId() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return user && (user.id || user._id) ? String(user.id || user._id) : '';
  } catch (error) {
    return '';
  }
}

function showDashboard() {
  const login = $('login');
  if (login) login.classList.add('hidden');
  loadAll();
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.reload();
}

async function login(event) {
  event.preventDefault();
  showLoginError('');

  try {
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;

    const data = await api('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (!data.token) throw new Error('Admin login succeeded but no token was returned.');

    localStorage.setItem(TOKEN_KEY, data.token);
    saveAdminUser(data.user);

    const adminName = $('adminName');
    if (adminName) adminName.textContent = data.user && (data.user.name || data.user.email) || 'Administrator';

    showDashboard();
  } catch (error) {
    showLoginError(error.message);
  }
}

async function loadAll() {
  try {
    const results = await Promise.all([
      api('/admin/stats'),
      api('/admin/users'),
      api('/admin/professors'),
      api('/admin/reviews'),
      api('/admin/me')
    ]);

    const stats = results[0];
    const userData = results[1];
    const professorData = results[2];
    const reviewData = results[3];
    const me = results[4];

    saveAdminUser(me.user);

    if ($('statUsers')) $('statUsers').textContent = stats.users || 0;
    if ($('statProfessors')) $('statProfessors').textContent = stats.professors || 0;
    if ($('statReviews')) $('statReviews').textContent = stats.reviews || 0;
    if ($('statRating')) $('statRating').textContent = stats.averageRating || '0.0';
    if ($('adminName')) $('adminName').textContent = me.user && (me.user.name || me.user.email) || 'Administrator';

    users = userData.users || [];
    professors = professorData.professors || [];
    reviews = reviewData.reviews || [];

    renderUsers();
    renderProfessors();
    renderReviews();
  } catch (error) {
    if (/authentication|unauthorized|invalid token|expired|admin/i.test(error.message)) {
      logout();
    } else {
      showMessage(error.message);
    }
  }
}

function renderUsers() {
  const body = $('usersBody');
  if (!body) return;

  const query = (($('userSearch') && $('userSearch').value) || '').toLowerCase();
  const adminId = currentAdminId();

  body.innerHTML = users
    .filter((user) => `${user.name || ''} ${user.email || ''} ${user.university || ''}`.toLowerCase().includes(query))
    .map((user) => {
      const id = String(user._id || user.id || '');
      const isAdmin = user.role === 'admin';
      const isCurrent = id === adminId;
      return `<tr>
        <td><strong>${escapeHtml(user.name)}</strong></td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.university || '—')}</td>
        <td><span class="badge">${escapeHtml(user.role || 'student')}</span></td>
        <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
        <td>
          ${!isAdmin ? `<button class="danger" data-delete-user="${id}">Delete</button>` : ''}
          ${!isCurrent ? `<button class="role" data-role-id="${id}" data-role="${isAdmin ? 'student' : 'admin'}">Make ${isAdmin ? 'Student' : 'Admin'}</button>` : ''}
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="6">No users found.</td></tr>';
}

function renderProfessors() {
  const body = $('professorsBody');
  if (!body) return;

  const query = (($('profSearch') && $('profSearch').value) || '').toLowerCase();

  body.innerHTML = professors
    .filter((professor) => `${professor.name || ''} ${professor.course || ''} ${professor.dept || ''} ${professor.university || ''}`.toLowerCase().includes(query))
    .map((professor) => {
      const id = String(professor._id || professor.id || '');
      return `<tr>
        <td><strong>${escapeHtml(professor.name)}</strong></td>
        <td>${escapeHtml(professor.course)}</td>
        <td>${escapeHtml(professor.dept || '—')}</td>
        <td>${escapeHtml(professor.university || '—')}</td>
        <td>★ ${Number(professor.rating || 0).toFixed(1)}</td>
        <td>${professor.reviews || 0}</td>
        <td><button class="danger" data-delete-prof="${id}">Delete</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No professors found.</td></tr>';
}

function renderReviews() {
  const body = $('reviewsBody');
  if (!body) return;

  const query = (($('reviewSearch') && $('reviewSearch').value) || '').toLowerCase();

  body.innerHTML = reviews
    .filter((review) => `${review.comment || ''} ${review.user && review.user.name || ''} ${review.professor && review.professor.name || ''}`.toLowerCase().includes(query))
    .map((review) => {
      const id = String(review._id || review.id || '');
      const professor = review.professor || {};
      const user = review.user || {};
      return `<tr>
        <td><strong>${escapeHtml(professor.name || 'Unknown')}</strong><small>${escapeHtml(professor.course || '')}</small></td>
        <td>${escapeHtml(user.name || 'Unknown')}<small>${escapeHtml(user.email || '')}</small></td>
        <td>★ ${escapeHtml(review.rating)}</td>
        <td class="review-text">${escapeHtml(review.comment)}</td>
        <td>${review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '—'}</td>
        <td><button class="danger" data-delete-review="${id}">Remove</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="6">No reviews found.</td></tr>';
}

async function removeReview(id) {
  if (!window.confirm('Remove this review permanently?')) return;
  try {
    await api(`/admin/reviews/${id}`, { method: 'DELETE' });
    showMessage('Review removed.');
    await loadAll();
  } catch (error) {
    showMessage(error.message);
  }
}

async function removeProfessor(id) {
  if (!window.confirm('Delete this professor and associated reviews?')) return;
  try {
    await api(`/admin/professors/${id}`, { method: 'DELETE' });
    showMessage('Professor deleted.');
    await loadAll();
  } catch (error) {
    showMessage(error.message);
  }
}

async function removeUser(id) {
  if (!window.confirm('Delete this user and their reviews?')) return;
  try {
    await api(`/admin/users/${id}`, { method: 'DELETE' });
    showMessage('User deleted.');
    await loadAll();
  } catch (error) {
    showMessage(error.message);
  }
}

async function changeRole(id, role) {
  try {
    await api(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
    showMessage('User role updated.');
    await loadAll();
  } catch (error) {
    showMessage(error.message);
  }
}

function switchSection(button) {
  document.querySelectorAll('.nav').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');

  document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));
  const target = $(button.dataset.section);
  if (target) target.classList.add('active');

  const title = button.querySelector('span');
  if ($('pageTitle') && title) $('pageTitle').textContent = title.textContent;
}

async function addProfessor(event) {
  event.preventDefault();
  try {
    await api('/admin/professors', {
      method: 'POST',
      body: JSON.stringify({
        name: $('profName').value.trim(),
        course: $('profCourse').value.trim(),
        dept: $('profDept').value.trim(),
        university: $('profUniversity').value.trim()
      })
    });

    event.target.reset();
    showMessage('Professor added.');
    await loadAll();
  } catch (error) {
    showMessage(error.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!API_BASE) {
    showLoginError('Backend URL is missing. Check api-config.js.');
    return;
  }

  const loginForm = $('loginForm');
  if (loginForm) loginForm.addEventListener('submit', login);

  const logoutButton = $('logout');
  if (logoutButton) logoutButton.addEventListener('click', logout);

  document.querySelectorAll('.nav').forEach((button) => {
    button.addEventListener('click', () => switchSection(button));
  });

  if ($('userSearch')) $('userSearch').addEventListener('input', renderUsers);
  if ($('profSearch')) $('profSearch').addEventListener('input', renderProfessors);
  if ($('reviewSearch')) $('reviewSearch').addEventListener('input', renderReviews);
  if ($('refreshUsers')) $('refreshUsers').addEventListener('click', loadAll);
  if ($('refreshProfessors')) $('refreshProfessors').addEventListener('click', loadAll);
  if ($('refreshReviews')) $('refreshReviews').addEventListener('click', loadAll);
  if ($('profForm')) $('profForm').addEventListener('submit', addProfessor);

  document.addEventListener('click', (event) => {
    const reviewButton = event.target.closest('[data-delete-review]');
    if (reviewButton) return removeReview(reviewButton.dataset.deleteReview);

    const professorButton = event.target.closest('[data-delete-prof]');
    if (professorButton) return removeProfessor(professorButton.dataset.deleteProf);

    const userButton = event.target.closest('[data-delete-user]');
    if (userButton) return removeUser(userButton.dataset.deleteUser);

    const roleButton = event.target.closest('[data-role-id]');
    if (roleButton) return changeRole(roleButton.dataset.roleId, roleButton.dataset.role);
  });

  if (getToken()) showDashboard();
});
