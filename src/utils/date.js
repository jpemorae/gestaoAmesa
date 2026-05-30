export function today() {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(date) {
  if (!date) return "--";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function diffDays(date) {
  if (!date) return 0;
  const start = new Date(today() + "T00:00:00");
  const end = new Date(date + "T00:00:00");
  return Math.ceil((end - start) / 86400000);
}

export function addDaysToToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().split("T")[0];
}

export function addDaysFromDate(dateString, days) {
  const date = dateString ? new Date(dateString + "T00:00:00") : new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().split("T")[0];
}

export function currentTimeHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

export function timeToMinutes(time) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function durationText(start, end) {
  const minutes = minutesBetween(start, end);
  return minutes === null ? "--" : durationFromMinutes(minutes);
}

export function minutesBetween(start, end) {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (startMin === null || endMin === null) return null;
  return Math.max(0, endMin - startMin);
}

export function durationFromMinutes(total) {
  const safeTotal = Math.max(0, Number(total || 0));
  const hours = Math.floor(safeTotal / 60);
  const minutes = safeTotal % 60;

  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function punctualityStatus(plannedStart, plannedEnd, realStart, realEnd) {
  const ps = timeToMinutes(plannedStart);
  const pe = timeToMinutes(plannedEnd);
  const rs = timeToMinutes(realStart);
  const re = timeToMinutes(realEnd);

  if ([ps, pe, rs, re].some((value) => value === null)) return "Sem horário planejado";

  const tolerance = 10;
  const startedOnTime = rs <= ps + tolerance;
  const finishedOnTime = re <= pe + tolerance;

  if (startedOnTime && finishedOnTime) return "Dentro do horário";
  if (!startedOnTime && !finishedOnTime) return "Iniciou e terminou fora do horário";
  if (!startedOnTime) return "Iniciou fora do horário";
  return "Terminou fora do horário";
}
