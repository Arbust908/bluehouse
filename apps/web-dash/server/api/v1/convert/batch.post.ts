export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  return {
    status: 'stub',
    endpoint: 'convert/batch',
    body,
  };
});
