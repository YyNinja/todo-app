import { z } from "zod";
import { protectedProcedure, router } from "../trpc/trpc";
import { TRPCError } from "@trpc/server";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function assertAdminOrOwner(
  ctx: { db: import("@prisma/client").PrismaClient; userId: string },
  workspaceId: string
) {
  const member = await ctx.db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: ctx.userId } },
    select: { role: true },
  });
  if (!member) throw new TRPCError({ code: "NOT_FOUND" });
  if (member.role === "member")
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return member;
}

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.workspace.findMany({
      where: {
        members: { some: { userId: ctx.userId } },
      },
      include: {
        _count: { select: { members: true, lists: true } },
        members: {
          where: { userId: ctx.userId },
          select: { role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const baseSlug = slugify(input.name) || "workspace";
      // ensure uniqueness
      const existing = await ctx.db.workspace.count({
        where: { slug: { startsWith: baseSlug } },
      });
      const slug = existing === 0 ? baseSlug : `${baseSlug}-${existing}`;

      return ctx.db.workspace.create({
        data: {
          name: input.name,
          slug,
          ownerId: ctx.userId,
          members: {
            create: { userId: ctx.userId, role: "owner" },
          },
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findFirst({
        where: {
          id: input.id,
          members: { some: { userId: ctx.userId } },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { joinedAt: "asc" },
          },
          lists: {
            include: { _count: { select: { todos: true } } },
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { members: true, lists: true } },
        },
      });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
      return workspace;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await assertAdminOrOwner(ctx, input.id);
      return ctx.db.workspace.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findFirst({
        where: { id: input.id, ownerId: ctx.userId },
      });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.workspace.delete({ where: { id: input.id } });
      return { success: true };
    }),

  invite: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        email: z.string().email(),
        role: z.enum(["admin", "member"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertAdminOrOwner(ctx, input.workspaceId);

      const invitee = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (!invitee)
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      return ctx.db.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: invitee.id,
          },
        },
        create: {
          workspaceId: input.workspaceId,
          userId: invitee.id,
          role: input.role,
        },
        update: { role: input.role },
      });
    }),

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        userId: z.string(),
        role: z.enum(["admin", "member"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertAdminOrOwner(ctx, input.workspaceId);

      // Cannot demote the owner
      const workspace = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { ownerId: true },
      });
      if (workspace?.ownerId === input.userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change owner role" });

      return ctx.db.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
        data: { role: input.role },
      });
    }),

  removeMember: protectedProcedure
    .input(z.object({ workspaceId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertAdminOrOwner(ctx, input.workspaceId);

      const workspace = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { ownerId: true },
      });
      if (workspace?.ownerId === input.userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove workspace owner" });

      await ctx.db.workspaceMember.deleteMany({
        where: { workspaceId: input.workspaceId, userId: input.userId },
      });
      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { ownerId: true },
      });
      if (workspace?.ownerId === ctx.userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Owner cannot leave — transfer ownership first" });

      await ctx.db.workspaceMember.deleteMany({
        where: { workspaceId: input.workspaceId, userId: ctx.userId },
      });
      return { success: true };
    }),

  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Must be a member
      const member = await ctx.db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: input.id, userId: ctx.userId } },
        select: { role: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const [memberCount, listCount, todoCount, completedCount] =
        await Promise.all([
          ctx.db.workspaceMember.count({ where: { workspaceId: input.id } }),
          ctx.db.list.count({ where: { workspaceId: input.id } }),
          ctx.db.todo.count({
            where: { list: { workspaceId: input.id } },
          }),
          ctx.db.todo.count({
            where: { list: { workspaceId: input.id }, completed: true },
          }),
        ]);

      return {
        memberCount,
        listCount,
        todoCount,
        completedCount,
        completionRate:
          todoCount > 0 ? Math.round((completedCount / todoCount) * 100) : 0,
      };
    }),
});
