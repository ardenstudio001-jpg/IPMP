import { Prisma } from '@prisma/client';

export const listItemInclude = {
  product: {
    include: {
      category: true,
    },
  },
  parties: {
    orderBy: { createdAt: 'asc' as const },
  },
  list: {
    select: {
      id: true,
      name: true,
      type: true,
      createdAt: true,
      createdById: true,
    },
  },
  parentItem: {
    select: {
      id: true,
      listId: true,
      status: true,
    },
  },
} satisfies Prisma.ListItemInclude;

export type ListItemWithRelations = Prisma.ListItemGetPayload<{
  include: typeof listItemInclude;
}>;
