export function money(value: number | string) {
  return `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP`;
}

export function date(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
