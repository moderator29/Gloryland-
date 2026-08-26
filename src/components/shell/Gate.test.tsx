import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gate } from "./Gate";
import { renderApp } from "@/test/helpers";
import { claimUsername } from "@/domain/identity";

/**
 * The first thing anyone sees, and the only place an identity is created.
 *
 * These are flow tests rather than render tests: they walk the four steps the
 * way a person does, because every defect that matters here is a defect in the
 * order of things, not in the markup.
 */

function inside() {
  return <p>Signed in</p>;
}

describe("the gate stands in front of the product", () => {
  it("shows the sign up flow when nobody is signed in", () => {
    renderApp(<Gate>{inside()}</Gate>);
    expect(screen.getByRole("heading", { name: /set up your identity/i })).toBeInTheDocument();
    expect(screen.queryByText("Signed in")).not.toBeInTheDocument();
  });

  it("lets a signed in member straight through", () => {
    localStorage.setItem(
      "rgl_member_v2",
      JSON.stringify({
        username: "marcus",
        displayName: "Marcus",
        approach: "steady",
        joinedAt: Date.now(),
      }),
    );
    renderApp(<Gate>{inside()}</Gate>);
    expect(screen.getByText("Signed in")).toBeInTheDocument();
  });
});

describe("identity", () => {
  it("offers a handle derived from the name, and stops once the handle is edited", async () => {
    const user = userEvent.setup();
    renderApp(<Gate>{inside()}</Gate>);

    await user.type(screen.getByLabelText(/your name/i), "Marcus Adeyemi");
    const handle = screen.getByLabelText(/handle/i);
    await waitFor(() => expect(handle).toHaveValue("marcusadeyemi"));

    await user.clear(handle);
    await user.type(handle, "marcus");
    // Typing more of the name must not overwrite a handle the member chose.
    await user.type(screen.getByLabelText(/your name/i), " Jr");
    expect(handle).toHaveValue("marcus");
  });

  it("strips anything outside the allowed set as it is typed", async () => {
    const user = userEvent.setup();
    renderApp(<Gate>{inside()}</Gate>);
    const handle = screen.getByLabelText(/handle/i);
    await user.type(handle, "Marcus Adeyemi!!!");
    expect(handle).toHaveValue("marcusadeyemi");
  });

  it("refuses a handle kept for the platform, and says why", async () => {
    const user = userEvent.setup();
    renderApp(<Gate>{inside()}</Gate>);
    await user.type(screen.getByLabelText(/your name/i), "Support");
    await waitFor(() =>
      expect(screen.getAllByText(/kept for the platform/i).length).toBeGreaterThan(0),
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("refuses a handle already claimed, and offers alternatives", async () => {
    claimUsername("marcus");
    const user = userEvent.setup();
    renderApp(<Gate>{inside()}</Gate>);

    await user.type(screen.getByLabelText(/your name/i), "Marcus");
    // Once visibly on the field, and once in the live region for a screen
    // reader. Both are wanted.
    await waitFor(() => expect(screen.getAllByText(/already in use/i).length).toBe(2), {
      timeout: 3000,
    });

    // Three alternatives are offered, each a variation on what was typed.
    const suggestions = await screen.findAllByRole("button", { name: /^@marcus./ });
    expect(suggestions.length).toBe(3);
    for (const s of suggestions) expect(s.textContent).not.toBe("@marcus");
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("will not advance on a name that is too short", async () => {
    const user = userEvent.setup();
    renderApp(<Gate>{inside()}</Gate>);
    await user.type(screen.getByLabelText(/handle/i), "marcus");
    await waitFor(() => expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled(), {
      timeout: 3000,
    });
  });
});

describe("the four steps", () => {
  async function reachApproach(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/your name/i), "Marcus Adeyemi");
    const go = screen.getByRole("button", { name: /continue/i });
    await waitFor(() => expect(go).toBeEnabled(), { timeout: 3000 });
    await user.click(go);
  }

  it("walks identity, approach, scale and a summary, and creates the member", async () => {
    const user = userEvent.setup();
    renderApp(<Gate>{inside()}</Gate>);

    await reachApproach(user);
    expect(
      await screen.findByRole("heading", { name: /how do you want to run it/i }),
    ).toBeInTheDocument();

    // Every option must state its own cost, so no option can read as free.
    await user.click(screen.getByRole("radio", { name: /compounding/i }));
    expect(screen.getByText(/not liquid until you stop/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(
      await screen.findByRole("heading", { name: /where would you start/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("heading", { name: /ready, marcus/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /enter rigel/i }));
    expect(await screen.findByText("Signed in")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("rgl_member_v2") ?? "{}");
    expect(stored.username).toBe("marcusadeyemi");
    expect(stored.displayName).toBe("Marcus Adeyemi");
    expect(stored.approach).toBe("compound");
  });

  it("can go back without losing what was typed", async () => {
    const user = userEvent.setup();
    renderApp(<Gate>{inside()}</Gate>);

    await reachApproach(user);
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/your name/i)).toHaveValue("Marcus Adeyemi");
  });
});

describe("what the gate promises", () => {
  it("says plainly that no account is created", () => {
    renderApp(<Gate>{inside()}</Gate>);
    expect(screen.getByText(/no account is created and no password is set/i)).toBeInTheDocument();
  });

  it("states the risk before the member enters", async () => {
    const user = userEvent.setup();
    renderApp(<Gate>{inside()}</Gate>);
    await user.type(screen.getByLabelText(/your name/i), "Marcus Adeyemi");
    const go = screen.getByRole("button", { name: /continue/i });
    await waitFor(() => expect(go).toBeEnabled(), { timeout: 3000 });
    await user.click(go);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/including the risk of total loss/i)).toBeInTheDocument();
    expect(screen.getByText(/is investment advice/i)).toBeInTheDocument();
  });
});
