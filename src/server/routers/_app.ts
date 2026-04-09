import { router } from "../trpc/trpc";
import { todosRouter } from "./todos";
import { listsRouter } from "./lists";
import { commentsRouter } from "./comments";
import { billingRouter } from "./billing";

export const appRouter = router({
  todos: todosRouter,
  lists: listsRouter,
  comments: commentsRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
