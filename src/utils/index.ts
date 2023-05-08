export const getIsCommand = (target: any) => (
  typeof target === 'string' || Array.isArray(target) || target.__type === 'command'
);

export const getCommand = (value: string | string[]) => {
  if (Array.isArray(value)) return value.join(' && ');

  return value;
}

