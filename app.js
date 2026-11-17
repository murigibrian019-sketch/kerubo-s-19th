const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById('wish-form');
const feed = document.getElementById('wishes-feed');
const submitBtn = document.getElementById('submit-btn');
const themeToggle = document.getElementById('theme-toggle');

themeToggle.addEventListener('click', () => {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  themeToggle.textContent = isDark ? 'Dark Mode' : 'Light Mode';
});

function renderWish(wish, prepend = false) {
  const card = document.createElement('article');
  card.className = 'wish-card';

  const imgHtml = wish.photo_url ? `<img src="${wish.photo_url}" alt="Memory" loading="lazy" />` : '';
  card.innerHTML = `
    ${imgHtml}
    <div class="wish-content">
      <p>${escapeHtml(wish.message)}</p>
      <span>— ${escapeHtml(wish.sender_name)}</span>
    </div>
  `;

  if (prepend) {
    feed.prepend(card);
  } else {
    feed.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadWishes() {
  const { data, error } = await db
    .from('wishes')
    .select('*')
    .order('created_at', { ascending: false });

  if (!error && data) {
    feed.innerHTML = '';
    data.forEach(wish => renderWish(wish));
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting...';

  const sender = document.getElementById('sender').value.trim();
  const message = document.getElementById('message').value.trim();
  const fileInput = document.getElementById('photo');
  let photoUrl = null;

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { data: uploadData, error: uploadError } = await db.storage
      .from('birthday-photos')
      .upload(fileName, file);

    if (!uploadError) {
      const { data: urlData } = db.storage
        .from('birthday-photos')
        .getPublicUrl(uploadData.path);
      photoUrl = urlData.publicUrl;
    }
  }

  await db.from('wishes').insert([{ sender_name: sender, message, photo_url: photoUrl }]);

  form.reset();
  submitBtn.disabled = false;
  submitBtn.textContent = 'Post Wish';
});

db.channel('realtime-wishes')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishes' }, (payload) => {
    renderWish(payload.new, true);
  })
  .subscribe();

loadWishes();
