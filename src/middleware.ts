import { defineMiddleware } from "astro:middleware";
import { auth } from "./lib/auth";

export const onRequest = defineMiddleware(async ({ request, locals }, next) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session?.user) {
    locals.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    };
  } else {
    locals.user = null;
  }

  return next();
});
