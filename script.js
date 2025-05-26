const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const eventForm = document.getElementById('eventForm');
const closeBtn = document.querySelector('.closeBtn');
const dateInput = document.getElementById('date');
const titleInput = document.getElementById('title');
const colorInput = document.getElementById('color');
const recurrenceInput = document.getElementById('recurrence');
const saveBtn = document.getElementById('saveEvent');
const deleteBtn = document.getElementById('deleteEvent');
const searchInput = document.getElementById('search');
const filterSelect = document.getElementById('filter');
const toggleViewBtn = document.getElementById('toggleView');

const conflictPopup = document.getElementById('conflictPopup');
const closeConflictPopup = document.getElementById('closeConflictPopup');
const dismissConflict = document.getElementById('dismissConflict');

let events = JSON.parse(localStorage.getItem('events')) || [];
let selectedDate = null;
let editingEventId = null;
let currentDate = new Date();
let isWeeklyView = false;

function saveEvents() {
  localStorage.setItem('events', JSON.stringify(events));
}

function getEventsForDate(date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const targetISO = target.toISOString();

  return events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    const eventISO = eventDate.toISOString();

    if (eventISO === targetISO) return true;

    if (event.recurrence) {
      const original = new Date(event.date);
      switch (event.recurrence) {
        case 'daily':
          return original <= target;
        case 'weekly':
          return original <= target && original.getDay() === target.getDay();
        case 'monthly':
          return original <= target && original.getDate() === target.getDate();
        case 'yearly':
          return (
            original <= target &&
            original.getDate() === target.getDate() &&
            original.getMonth() === target.getMonth()
          );
      }
    }
    return false;
  });
}

function createEventElement(ev) {
  const el = document.createElement('div');
  el.className = 'event';
  el.textContent = ev.title;
  el.style.backgroundColor = ev.color || '#4caf50';
  el.draggable = true;
  el.dataset.id = ev.id;

  const filterColor = filterSelect.value;
  const searchQuery = searchInput.value.toLowerCase();

  if ((filterColor !== 'all' && ev.color !== filterColor) ||
      (searchQuery && !ev.title.toLowerCase().includes(searchQuery))) {
    el.style.display = 'none';
  }

  el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', ev.id);
  });

  el.addEventListener('click', e => {
    e.stopPropagation();
    const event = events.find(ev => ev.id === e.target.dataset.id);
    if (event) openForm(new Date(event.date), event, e.target.parentElement);
  });

  return el;
}

function handleDrop(e, targetDate) {
  e.preventDefault();
  const eventId = e.dataTransfer.getData('text/plain');
  const event = events.find(ev => ev.id === eventId);
  if (!event) return;

  const targetDateISO = targetDate.toISOString();

  if (checkConflict(event.title, targetDateISO, event.id)) {
    showConflictPopup();
    return;
  }

  targetDate.setHours(0, 0, 0, 0);
  event.date = targetDate.toISOString();
  saveEvents();
  generateCalendar(currentDate);
}

function checkConflict(title, dateISO, excludeId = null) {
  const dateOnly = dateISO.slice(0, 10);
  return events.some(ev =>
    ev.title === title &&
    ev.date.slice(0, 10) === dateOnly &&
    ev.id !== excludeId
  );
}

function openForm(date, event = null, dateCell = null) {
  selectedDate = new Date(date);
  editingEventId = event ? event.id : null;

  eventForm.style.display = 'block';
  dateInput.value = selectedDate.toISOString().slice(0, 10);
  titleInput.value = event?.title || '';
  colorInput.value = event?.color || '#4caf50';
  recurrenceInput.value = event?.recurrence || 'none';
  deleteBtn.style.display = event ? 'inline-block' : 'none';

  if (dateCell) {
    const rect = dateCell.getBoundingClientRect();
    const scrollTop = window.scrollY;
    const scrollLeft = window.scrollX;

    eventForm.style.position = 'absolute';
    eventForm.style.top = rect.top + scrollTop + rect.height + 5 + 'px';
    eventForm.style.left = rect.left + scrollLeft + 'px';
    eventForm.style.transform = 'none';
  } else {
    eventForm.style.position = 'fixed';
    eventForm.style.top = '50%';
    eventForm.style.left = '50%';
    eventForm.style.transform = 'translate(-50%, -50%)';
  }
}

function closeForm() {
  eventForm.style.display = 'none';
  editingEventId = null;
  selectedDate = null;
  eventForm.style.transform = '';
}

function generateCalendar(date) {
  calendar.innerHTML = '';

  const year = date.getFullYear();
  const month = date.getMonth();

  monthYear.textContent = date.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  let startDay, daysInView;

  if (isWeeklyView) {
    const dayOfWeek = date.getDay();
    startDay = new Date(year, month, date.getDate() - dayOfWeek);
    daysInView = 7;
  } else {
    const firstDayOfMonth = new Date(year, month, 1);
    startDay = new Date(firstDayOfMonth);
    startDay.setDate(startDay.getDate() - firstDayOfMonth.getDay());
    daysInView = 42;
  }

  for (let i = 0; i < daysInView; i++) {
    const current = new Date(startDay.getTime() + i * 86400000);

    const cell = document.createElement('div');
    cell.className = 'day';

    if (current.getMonth() !== month && !isWeeklyView) cell.classList.add('empty');
    if (current.toDateString() === new Date().toDateString()) cell.classList.add('today');

    cell.dataset.date = current.toISOString().slice(0, 10);

    const dateDiv = document.createElement('div');
    dateDiv.className = 'date';
    dateDiv.textContent = current.getDate();
    cell.appendChild(dateDiv);

    const dayEvents = getEventsForDate(current);
    dayEvents.forEach(ev => cell.appendChild(createEventElement(ev)));

    cell.addEventListener('dragover', e => e.preventDefault());
    cell.addEventListener('drop', e => handleDrop(e, new Date(current)));
    cell.addEventListener('click', () => openForm(new Date(current), null, cell));

    calendar.appendChild(cell);
  }
}

document.getElementById('prev').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + (isWeeklyView ? -7 : -currentDate.getDate()));
  generateCalendar(currentDate);
});

document.getElementById('next').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + (isWeeklyView ? 7 : 31));
  generateCalendar(currentDate);
});

saveBtn.addEventListener('click', () => {
  const title = titleInput.value.trim();
  const date = new Date(dateInput.value);
  const color = colorInput.value;
  const recurrence = recurrenceInput.value === 'none' ? null : recurrenceInput.value;

  if (!title) return alert('Please enter a title.');
  if (checkConflict(title, date.toISOString(), editingEventId)) {
    showConflictPopup();
    return;
  }

  if (editingEventId) {
    const event = events.find(ev => ev.id === editingEventId);
    if (event) {
      event.title = title;
      event.date = date.toISOString();
      event.color = color;
      event.recurrence = recurrence;
    }
  } else {
    events.push({
      id: Date.now().toString(),
      title,
      date: date.toISOString(),
      color,
      recurrence,
    });
  }

  saveEvents();
  generateCalendar(currentDate);
  closeForm();
});

deleteBtn.addEventListener('click', () => {
  events = events.filter(ev => ev.id !== editingEventId);
  saveEvents();
  generateCalendar(currentDate);
  closeForm();
});

closeBtn.addEventListener('click', closeForm);

document.addEventListener('click', e => {
  if (!eventForm.contains(e.target) && !e.target.closest('.event') && !e.target.closest('.day')) {
    closeForm();
  }
});

searchInput.addEventListener('input', () => generateCalendar(currentDate));
filterSelect.addEventListener('change', () => generateCalendar(currentDate));

toggleViewBtn.addEventListener('click', () => {
  isWeeklyView = !isWeeklyView;
  toggleViewBtn.textContent = isWeeklyView ? 'Switch to Monthly View' : 'Switch to Weekly View';
  generateCalendar(currentDate);
});

// ✅ Conflict Popup Handlers
function showConflictPopup() {
  conflictPopup.classList.add('active');
}

function hideConflictPopup() {
  conflictPopup.classList.remove('active');
}

closeConflictPopup.addEventListener('click', hideConflictPopup);
dismissConflict.addEventListener('click', hideConflictPopup);

// ✅ Initialize calendar
generateCalendar(currentDate);
