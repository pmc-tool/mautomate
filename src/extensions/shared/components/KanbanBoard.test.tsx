import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KanbanBoard } from "./KanbanBoard";
import type { UnifiedPost } from "./KanbanCard";

// Mock KanbanCard to avoid deep dependency chain
vi.mock("./KanbanCard", () => ({
  KanbanCard: ({ post }: { post: any }) => (
    <div data-testid={`card-${post.id}`}>{post.title}</div>
  ),
}));

// Mock shadcn Badge
vi.mock("../../../client/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

// Mock dnd-kit
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn() })),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: "vertical",
}));

const mockPost = (overrides: Partial<UnifiedPost> = {}): UnifiedPost => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "Test Post",
  content: "Test content",
  status: "draft",
  postType: "social",
  platform: "instagram",
  agentId: "agent-1",
  agentName: "Social Agent",
  seoScore: null,
  aeoScore: null,
  scheduledAt: null,
  publishedAt: null,
  createdAt: "2026-03-10T00:00:00Z",
  updatedAt: "2026-03-10T00:00:00Z",
  ...overrides,
});

describe("KanbanBoard", () => {
  it("renders all 4 columns", () => {
    render(
      <KanbanBoard posts={[]} onMovePost={vi.fn()} onViewDetail={vi.fn()} />
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("shows empty state in columns with no posts", () => {
    render(
      <KanbanBoard posts={[]} onMovePost={vi.fn()} onViewDetail={vi.fn()} />
    );

    const emptyStates = screen.getAllByText("No posts");
    expect(emptyStates).toHaveLength(4);
  });

  it("renders posts in correct columns", () => {
    const posts = [
      mockPost({ id: "a0000000-0000-0000-0000-000000000001", title: "Draft Post", status: "draft" }),
      mockPost({ id: "a0000000-0000-0000-0000-000000000002", title: "Approved Post", status: "approved" }),
      mockPost({ id: "a0000000-0000-0000-0000-000000000003", title: "Scheduled Post", status: "scheduled" }),
    ];

    render(
      <KanbanBoard posts={posts} onMovePost={vi.fn()} onViewDetail={vi.fn()} />
    );

    expect(screen.getByText("Draft Post")).toBeInTheDocument();
    expect(screen.getByText("Approved Post")).toBeInTheDocument();
    expect(screen.getByText("Scheduled Post")).toBeInTheDocument();
  });

  it("shows correct post counts in badges", () => {
    const posts = [
      mockPost({ id: "a0000000-0000-0000-0000-000000000001", status: "draft" }),
      mockPost({ id: "a0000000-0000-0000-0000-000000000002", status: "draft" }),
      mockPost({ id: "a0000000-0000-0000-0000-000000000003", status: "approved" }),
    ];

    render(
      <KanbanBoard posts={posts} onMovePost={vi.fn()} onViewDetail={vi.fn()} />
    );

    // Draft column badge = 2, Approved = 1, Scheduled = 0, Published = 0
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
