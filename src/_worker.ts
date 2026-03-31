export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(null, { status: 404 });
  },
};
