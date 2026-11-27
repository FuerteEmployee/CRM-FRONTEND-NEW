// Rows per page: the shared footer's optional "Rows" select and the HRMS
// DataTable (which had no way to change the page size before).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { TablePagination } from "@/components/ui/table";
import { DataTable } from "@/hrms/components/common/DataTable";

afterEach(cleanup);

const rows = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, name: `Person ${String(i + 1).padStart(2, "0")}` }));
const columns = [{ header: "Name", accessorKey: "name" as const }];
const bodyRows = () => screen.getAllByRole("row").filter((r) => /Person \d+/.test(r.textContent || ""));

describe("TablePagination rows select", () => {
  it("is shown only when the page asks for it", () => {
    const { rerender } = render(<TablePagination page={1} pageSize={10} total={60} onPageChange={() => {}} />);
    expect(screen.queryByLabelText("Rows per page")).toBeNull();
    const onSize = vi.fn();
    rerender(<TablePagination page={1} pageSize={10} total={60} onPageChange={() => {}} sizeValue="10" onSizeChange={onSize} />);
    const sel = screen.getByLabelText("Rows per page") as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).toEqual(["10", "25", "50", "100", "All"]);
    fireEvent.change(sel, { target: { value: "All" } });
    expect(onSize).toHaveBeenCalledWith("All");
  });
  it("custom choices (server-paged lists: no All)", () => {
    render(<TablePagination page={1} pageSize={10} total={60} onPageChange={() => {}} sizeValue="10" onSizeChange={() => {}} sizeChoices={["10", "25", "50", "100"]} />);
    expect([...(screen.getByLabelText("Rows per page") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["10", "25", "50", "100"]);
  });
});

describe("HRMS DataTable rows per page", () => {
  it("10 / 25 / 50 / 100 / All change how many rows are shown", () => {
    render(<DataTable data={rows} columns={columns as any} pageSize={10} />);
    expect(bodyRows()).toHaveLength(10);
    const sel = screen.getByLabelText("Rows per page");
    fireEvent.change(sel, { target: { value: "25" } });
    expect(bodyRows()).toHaveLength(25);
    fireEvent.change(sel, { target: { value: "50" } });
    expect(bodyRows()).toHaveLength(50);
    fireEvent.change(sel, { target: { value: "All" } });
    expect(bodyRows()).toHaveLength(60);
    expect(screen.getByText(/Showing/).textContent).toMatch(/1 to 60 of 60/);
  });
  it("a bigger size from page 3 goes back to page 1", () => {
    render(<DataTable data={rows} columns={columns as any} pageSize={10} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Pagination" })).getByRole("button", { name: "3" }));
    expect(bodyRows()[0].textContent).toContain("Person 21");
    fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "50" } });
    expect(bodyRows()[0].textContent).toContain("Person 01");
    expect(bodyRows()).toHaveLength(50);
  });
  it("server-paged: asks the page for the new size and goes to page 1; no All", () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(<DataTable data={rows.slice(0, 10)} columns={columns as any} pageSize={10} totalItems={60} currentPage={2} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />);
    const sel = screen.getByLabelText("Rows per page") as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).toEqual(["10", "25", "50", "100"]);
    fireEvent.change(sel, { target: { value: "25" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
  it("server-paged without a size handler shows no select", () => {
    render(<DataTable data={rows.slice(0, 10)} columns={columns as any} pageSize={10} totalItems={60} currentPage={1} onPageChange={() => {}} />);
    expect(screen.queryByLabelText("Rows per page")).toBeNull();
  });
});
