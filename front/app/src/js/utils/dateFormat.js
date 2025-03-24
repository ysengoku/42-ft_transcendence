export function getRelativeTime(time) {
  const now = new Date();
  const date = new Date(time);
  const diff = now - date;

  if (diff < 60000) {
    return 'now';
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`;
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}h ago`;
  }
  if (diff < 172800000) {
    return 'yesterday';
  }
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}days ago`;
  }
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return formattedDate;
}

export function getRelativeDateAndTime(time) {
  const now = new Date();
  const date = new Date(time);
  
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const targetDate = date.toISOString().split('T')[0];
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  
  if (targetDate === today) {
    return `today, ${formattedTime}`;
  }
  if (targetDate === yesterdayStr) {
    return `yesterday, ${formattedTime}`;
  }
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
  return `${formattedDate}, ${formattedTime}`;
 }
  