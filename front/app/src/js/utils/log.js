function outputLog(level) {
  return (...args) => {
    if (process.env.NODE_ENV === 'development') {
      switch (level) {
        case 'trace':
          console.trace(`%c[TRACE]`, `color: blue; font-weight: bold;`, ...args);
          break;
        case 'error':
        case 'info':
          const stack = new Error().stack.split('\n')[3].trim();
          const match = stack.match(/([^\/\\]+:\d+:\d+)/);
          let location = match ? match[1] : 'unknown';
          location = location.replace(/\?t=\d+/, '');
          console[level](
            `%c[${level.toUpperCase()}]`,
            `color: ${level === 'error' ? 'red' : 'green'}; font-weight: bold;`,
            `(${location})`,
            ...args,
          );
          break;
        default:
          break;
      }
    }
  };
}

window.log = {
  error: (...args) => {
    outputLog('error')(...args);
  },
  trace: (...args) => {
    outputLog('trace')(...args);
  },
  info: (...args) => {
    outputLog('info')(...args);
  },
};
