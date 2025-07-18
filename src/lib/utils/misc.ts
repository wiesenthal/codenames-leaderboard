export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const normalize = (str: string) => str.toLowerCase().trim();
