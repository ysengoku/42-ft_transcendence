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
  const formatedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return formatedDate;
}
