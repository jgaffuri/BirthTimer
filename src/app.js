const SUPPORTED_LANGS = [
  'en', 'fr', 'de', 'es', 'pt', 'it', 'nl', 'lb', 'fi', 'sv', 'zh', 'el', 'pl', 'cs',
  'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'lv', 'lt', 'et', 'da', 'no', 'hi', 'ar', 'bn',
  'ru', 'ja', 'ur', 'is', 'sr', 'bs', 'mk', 'uk', 'be', 'tr', 'sq', 'ca', 'eu', 'gl', 'rm'
];

const state = {
  lang: 'en',
  locale: 'en-IE',
  translations: {},
  milestonesCache: [],
  timerId: null,
  timelineTimerId: null,
  theme: 'light',
};

const dom = {};

function getURLParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function updateURLParam(name, value) {
  const params = new URLSearchParams(window.location.search);
  params.set(name, value);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', nextUrl);
}

function getLanguageFromBrowser() {
  const locale = getURLParam('locale') || navigator.language || navigator.userLanguage || 'en-IE';
  const userLang = locale.substring(0, 2);
  if (SUPPORTED_LANGS.includes(getURLParam('lang'))) {
    return getURLParam('lang');
  }
  if (SUPPORTED_LANGS.includes(userLang)) {
    return userLang;
  }
  return 'en';
}

function setDefaultDateTime() {
  let startParam = getURLParam('start');
  let start = null;

  if (startParam) {
    const parsed = new Date(startParam);
    if (!Number.isNaN(parsed.getTime())) {
      start = parsed;
    }
  }

  if (!start) {
    start = new Date();
    start.setFullYear(start.getFullYear() - 30);
    updateURLParam('start', start.toISOString());
  }

  dom.dateInput.value = formatDateValue(start);
  dom.timeInput.value = formatTimeValue(start);
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeValue(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function parseSelectedStart() {
  const dateValue = dom.dateInput.value;
  const timeValue = dom.timeInput.value;

  if (!dateValue || !timeValue) {
    return null;
  }

  const value = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
}

function getDurationValues(start) {
  const now = new Date();
  const durationMs = now.getTime() - start.getTime();

  if (durationMs <= 0) {
    return null;
  }

  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(durationMs / 3600000);
  const days = Math.floor(durationMs / 86400000);
  const weeks = Math.floor(durationMs / (7 * 86400000));
  const months = Math.floor(days / 30.44);
  const years = Math.floor(months / 12);

  return { years, months, weeks, days, hours, minutes, seconds };
}

function renderAges() {
  const start = parseSelectedStart();
  if (!start) {
    return;
  }

  const durations = getDurationValues(start);
  if (!durations) {
    return;
  }

  const items = [
    { value: durations.years, label: state.translations.years },
    { value: durations.months, label: state.translations.months },
    { value: durations.weeks, label: state.translations.weeks },
    { value: durations.days, label: state.translations.days },
    { value: durations.hours, label: state.translations.hours },
    { value: durations.minutes, label: state.translations.minutes },
    { value: durations.seconds, label: state.translations.seconds },
  ];

  dom.durationList.innerHTML = items.map(item => `<li>${Number(item.value).toLocaleString(state.locale)} ${item.label}</li>`).join('');
}

function startTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
  }
  if (state.timelineTimerId) {
    clearInterval(state.timelineTimerId);
  }

  renderAges();
  state.timerId = window.setInterval(renderAges, 1000);
  state.timelineTimerId = window.setInterval(generateMilestones, 60000);
}

function startsWithTenMilestone(value) {
  return value >= 10 && Number.isInteger(Math.log10(value));
}

function generateMilestones() {
  const start = parseSelectedStart();
  if (!start) {
    return;
  }

  const now = new Date();
  const maxYears = 100;
  const maxMs = maxYears * 365.25 * 86400000;
  const units = [
    { unit: 's', label: state.translations.seconds, factor: 1000 },
    { unit: 'mi', label: state.translations.minutes, factor: 60000 },
    { unit: 'h', label: state.translations.hours, factor: 3600000 },
    { unit: 'd', label: state.translations.days, factor: 86400000 },
    { unit: 'w', label: state.translations.weeks, factor: 7 * 86400000 },
    { unit: 'mo', label: state.translations.months, factor: 30.44 * 86400000 },
    { unit: 'y', label: state.translations.years, factor: 365.25 * 86400000 },
  ];

  const milestones = [];

  units.forEach((unit) => {
    for (let exp = 0; exp <= 11; exp += 1) {
      for (const multiplier of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9]) {
        const value = multiplier * (10 ** exp);
        const durationMs = value * unit.factor;

        if (durationMs > maxMs) {
          break;
        }

        const milestoneDate = new Date(start.getTime() + durationMs);
        if (milestoneDate > now) {
          milestones.push({
            value,
            unit: unit.unit,
            label: unit.label,
            date: milestoneDate,
            durationMs,
          });
        }
      }
    }
  });

  milestones.sort((a, b) => a.durationMs - b.durationMs);
  state.milestonesCache = milestones;

  const selectedUnits = Array.from(document.querySelectorAll('.filterUnit:checked')).map((checkbox) => checkbox.value);
  renderTimeline(milestones.filter((milestone) => selectedUnits.includes(milestone.unit)));
}

function renderTimeline(milestones) {
  dom.timeline.replaceChildren();
  milestones.forEach((milestone) => {
    const item = document.createElement('li');
    item.className = `timeline-item${startsWithTenMilestone(milestone.value) ? ' is-major' : ''}`;

    const date = document.createElement('time');
    date.className = 'timeline-date';
    date.dateTime = milestone.date.toISOString();
    date.textContent = new Intl.DateTimeFormat(state.locale, {
      dateStyle: 'medium',
      timeStyle: ['s', 'mi', 'h'].includes(milestone.unit) ? 'short' : undefined,
    }).format(milestone.date);

    const title = document.createElement('strong');
    title.className = 'timeline-title';
    title.textContent = `${Number(milestone.value).toLocaleString(state.locale)} ${milestone.label}`;

    const countdown = document.createElement('span');
    countdown.className = 'timeline-countdown';
    countdown.textContent = formatTimeUntil(milestone.date - new Date());

    item.append(date, title, countdown);
    dom.timeline.append(item);
  });
}

function formatTimeUntil(durationMs) {
  const formatter = new Intl.RelativeTimeFormat(state.lang, { numeric: 'always' });
  const days = Math.floor(durationMs / 86400000);
  if (days > 0) return formatter.format(days, 'day');
  const hours = Math.floor(durationMs / 3600000);
  if (hours > 0) return formatter.format(hours, 'hour');
  const minutes = Math.max(1, Math.floor(durationMs / 60000));
  return formatter.format(minutes, 'minute');
}

function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function simplifyString(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function downloadIcs() {
  dom.icsDialog.classList.add('visible');
  dom.icsDialog.setAttribute('aria-hidden', 'false');
  dom.lastFocusedElement = document.activeElement;
  dom.personNameInput.focus();
}

function hideIcsDialog() {
  dom.icsDialog.classList.remove('visible');
  dom.icsDialog.setAttribute('aria-hidden', 'true');
  if (dom.lastFocusedElement) dom.lastFocusedElement.focus();
}

function validateIcsDialog() {
  const personName = dom.personNameInput.value.trim() || state.translations.me;
  hideIcsDialog();

  const selectedUnits = Array.from(document.querySelectorAll('.filterUnit:checked')).map((checkbox) => checkbox.value);
  const url = BIRTH_TIMER_URL + window.location.search;

  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//BirthTimer//EN\r\n';

  state.milestonesCache.forEach((milestone) => {
    if (!selectedUnits.includes(milestone.unit)) {
      return;
    }

    const dateText = milestone.date.toLocaleDateString(state.locale);
    const timeText = milestone.date.toLocaleTimeString(state.locale);
    const summary = `${Number(milestone.value).toLocaleString(state.locale)} ${milestone.label} - ${personName}`;
    const description = `${summary} - ${state.translations.onLabel} ${dateText} ${state.translations.atLabel} ${timeText} - ${url}`;

    ics += 'BEGIN:VEVENT\r\n';
    ics += `SUMMARY:${escapeIcsText(summary)}\r\n`;
    ics += `DESCRIPTION:${escapeIcsText(description)}\r\n`;
    ics += `URL:${escapeIcsText(url)}\r\n`;
    ics += `DTSTART:${formatIcsDate(milestone.date)}\r\n`;
    ics += `DTEND:${formatIcsDate(new Date(milestone.date.getTime() + 3600000))}\r\n`;
    ics += 'END:VEVENT\r\n';
  });

  ics += 'END:VCALENDAR\r\n';

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `bx_${simplifyString(personName)}.ics`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  announceShareStatus(state.translations.calendarDownloaded || 'Calendar file downloaded.');
}

function updateFromInputs() {
  const start = parseSelectedStart();
  if (!start) {
    return;
  }

  updateURLParam('start', start.toISOString());
  startTimer();
  generateMilestones();
}

function getShareContent() {
  return {
    url: `${window.location.origin}${window.location.pathname}${window.location.search}`,
    message: `${state.translations.title2} ${state.translations.shareMessage}`,
  };
}

function openShareWindow(url) {
  window.open(url, '_blank', 'noopener,noreferrer,width=800,height=600');
}

function announceShareStatus(message) {
  dom.shareStatus.textContent = message;
}

async function copyShareLink() {
  const { url } = getShareContent();
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const temporaryInput = document.createElement('textarea');
    temporaryInput.value = url;
    temporaryInput.setAttribute('readonly', '');
    temporaryInput.style.position = 'fixed';
    temporaryInput.style.opacity = '0';
    document.body.append(temporaryInput);
    temporaryInput.select();
    document.execCommand('copy');
    temporaryInput.remove();
  }
  announceShareStatus(state.translations.linkCopied || 'Link copied to clipboard.');
}

async function shareNatively() {
  const content = getShareContent();
  if (navigator.share) {
    try {
      await navigator.share({ title: state.translations.title, text: content.message, url: content.url });
    } catch (error) {
      if (error.name !== 'AbortError') announceShareStatus(state.translations.shareFailed || 'Unable to share right now.');
    }
    return;
  }
  await copyShareLink();
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  dom.themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  dom.themeToggle.textContent = theme === 'dark'
    ? (state.translations.lightTheme || 'Use light theme')
    : (state.translations.darkTheme || 'Use dark theme');
  try {
    localStorage.setItem('birthtimer-theme', theme);
  } catch {
    // Theme still works for the current page if storage is unavailable.
  }
}

function initTheme() {
  let savedTheme;
  try {
    savedTheme = localStorage.getItem('birthtimer-theme');
  } catch {
    savedTheme = null;
  }
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(savedTheme || preferred);
}

function bindEvents() {
  dom.dateInput.addEventListener('change', updateFromInputs);
  dom.timeInput.addEventListener('change', updateFromInputs);
  dom.icalButton.addEventListener('click', downloadIcs);
  dom.cancelBtn.addEventListener('click', hideIcsDialog);
  dom.validateBtn.addEventListener('click', validateIcsDialog);
  dom.copyLinkButton.addEventListener('click', copyShareLink);
  dom.nativeShareButton.addEventListener('click', shareNatively);
  dom.themeToggle.addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));
  dom.icsDialog.addEventListener('click', (event) => {
    if (event.target === dom.icsDialog) hideIcsDialog();
  });
  dom.personNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideIcsDialog();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dom.icsDialog.classList.contains('visible')) {
      hideIcsDialog();
    }
  });

  document.querySelectorAll('.filterUnit').forEach((checkbox) => {
    checkbox.addEventListener('change', generateMilestones);
  });

  dom.shareFacebook.addEventListener('click', () => {
    const content = getShareContent();
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.url)}&quote=${encodeURIComponent(content.message)}`);
  });

  dom.shareWhatsapp.addEventListener('click', () => {
    const content = getShareContent();
    openShareWindow(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${content.message} ${content.url}`)}`);
  });

  dom.shareTwitter.addEventListener('click', () => {
    const content = getShareContent();
    openShareWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(content.message)}&url=${encodeURIComponent(content.url)}`);
  });

  dom.shareLinkedin.addEventListener('click', () => {
    const content = getShareContent();
    openShareWindow(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(content.url)}&title=${encodeURIComponent(content.message)}`);
  });
}

function applyTranslations() {
  document.title = state.translations.title;
  dom.title.textContent = state.translations.title2;
  dom.intro.textContent = state.translations.intro;
  dom.birthdateLabel.textContent = `${state.translations.birthdateLabel} `;
  dom.atLabel.textContent = `${state.translations.atLabel} `;
  dom.myAge.textContent = state.translations.myAge;
  dom.myNextMilestones.textContent = state.translations.myNextMilestones;
  dom.icsDialogTitle.textContent = state.translations.icsDialogTitle;
  dom.personNameInput.value = state.translations.me;
  dom.validateBtn.textContent = state.translations.validate;
  dom.cancelBtn.textContent = state.translations.cancel;
  dom.shareTitle.textContent = state.translations.shareTitle || 'Share and save';
  dom.nativeShareButton.textContent = state.translations.shareButton || 'Share';
  dom.copyLinkButton.textContent = state.translations.copyLink || 'Copy link';

  dom.filters.innerHTML = [
    { unit: 'y', label: state.translations.filterYears, checked: false },
    { unit: 'mo', label: state.translations.filterMonths, checked: true },
    { unit: 'w', label: state.translations.filterWeeks, checked: true },
    { unit: 'd', label: state.translations.filterDays, checked: true },
    { unit: 'h', label: state.translations.filterHours, checked: true },
    { unit: 'mi', label: state.translations.filterMinutes, checked: true },
    { unit: 's', label: state.translations.filterSeconds, checked: true },
  ].map(({ unit, label, checked }) => `
    <label><input type="checkbox" class="filterUnit" value="${unit}" ${checked ? 'checked' : ''}> ${label}</label>
  `).join('');

  document.querySelectorAll('.filterUnit').forEach((checkbox) => {
    checkbox.addEventListener('change', generateMilestones);
  });
  setTheme(state.theme);
}

function fetchTranslations() {
  fetch('lang.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load translations: ${response.status}`);
      }
      return response.json();
    })
    .then((translations) => {
      state.translations = translations[state.lang] || translations.en;
      state.locale = getURLParam('locale') || navigator.language || navigator.userLanguage || 'en-IE';
      applyTranslations();
      initPage();
    })
    .catch((error) => {
      console.error(error);
      state.translations = {
        title: 'BirthTimer',
        title2: 'BirthTimer',
        intro: 'Why celebrate birthdays only once a year?',
        birthdateLabel: 'My birth date:',
        atLabel: 'at',
        myAge: 'My age',
        myNextMilestones: 'My next birth-Xs',
        icsDialogTitle: 'Who is this for?',
        me: 'Me',
        validate: 'Validate',
        cancel: 'Cancel',
        filterYears: 'Anniversaries',
        filterMonths: 'Month-iversaries',
        filterWeeks: 'Week-iversaries',
        filterDays: 'Day-iversaries',
        filterHours: 'Hour-iversaries',
        filterMinutes: 'Minute-iversaries',
        filterSeconds: 'Second-iversaries',
        years: 'years',
        months: 'months',
        weeks: 'weeks',
        days: 'days',
        hours: 'hours',
        minutes: 'minutes',
        seconds: 'seconds',
        onLabel: 'On ',
        shareTitle: 'Share and save',
        shareMessage: 'Here is the list of my next birth-Xs!',
      };
      state.locale = 'en-US';
      applyTranslations();
      initPage();
    });
}

function initPage() {
  setDefaultDateTime();
  startTimer();
  generateMilestones();
}

function cacheDom() {
  dom.title = document.getElementById('title');
  dom.intro = document.getElementById('intro');
  dom.birthdateLabel = document.getElementById('birthdateLabel');
  dom.atLabel = document.getElementById('atLabel');
  dom.dateInput = document.getElementById('dateInput');
  dom.timeInput = document.getElementById('timeInput');
  dom.myAge = document.getElementById('myAge');
  dom.durationList = document.getElementById('durationList');
  dom.myNextMilestones = document.getElementById('myNextMilestones');
  dom.timeline = document.getElementById('timeline');
  dom.filters = document.getElementById('filters');
  dom.themeToggle = document.getElementById('themeToggle');
  dom.shareTitle = document.getElementById('shareTitle');
  dom.nativeShareButton = document.getElementById('nativeShareButton');
  dom.copyLinkButton = document.getElementById('copyLinkButton');
  dom.shareStatus = document.getElementById('shareStatus');
  dom.icalButton = document.getElementById('icalButton');
  dom.shareFacebook = document.getElementById('share-facebook');
  dom.shareWhatsapp = document.getElementById('share-whatsapp');
  dom.shareTwitter = document.getElementById('share-twitter');
  dom.shareLinkedin = document.getElementById('share-linkedin');
  dom.icsDialog = document.getElementById('icsDialog');
  dom.icsDialogTitle = document.getElementById('icsDialogTitle');
  dom.personNameInput = document.getElementById('personNameInput');
  dom.validateBtn = document.getElementById('validateBtn');
  dom.cancelBtn = document.getElementById('cancelBtn');
}

function main() {
  cacheDom();
  state.lang = getLanguageFromBrowser();
  state.locale = getURLParam('locale') || navigator.language || navigator.userLanguage || 'en-IE';
  bindEvents();
  initTheme();
  fetchTranslations();
}

document.addEventListener('DOMContentLoaded', main);
