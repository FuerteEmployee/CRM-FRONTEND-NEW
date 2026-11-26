import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";

const rows = (n: number) => Array.from({ length: n }, (_, i) => <TableRow key={`r${i}`}><TableCell>{i}</TableCell></TableRow>);

describe("TableBody progressive rendering ('All' page size)", () => {
  it("small lists render at once", () => {
    const { container } = render(<Table><TableBody>{rows(150)}</TableBody></Table>);
    expect(container.querySelectorAll("tbody tr").length).toBe(150);
  });

  it("big lists show the first 100 at once, then all rows", async () => {
    const { container } = render(<Table><TableBody>{rows(1000)}</TableBody></Table>);
    expect(container.querySelectorAll("tbody tr").length).toBe(100);
    await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBe(1000), { timeout: 3000 });
  });
});
