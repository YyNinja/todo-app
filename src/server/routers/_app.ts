import { router } from "../trpc/trpc";
import { todosRouter } from "./todos";
import { listsRouter } from "./lists";
import { commentsRouter } from "./comments";

export const appRouter = router({
  todos: todosRouter,
  lists: listsRouter,
  comments: commentsRouter,
});

export type AppRouter = typeof appRouter;
