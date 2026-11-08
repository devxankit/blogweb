import { Link } from "react-router";
import { ActionButton, AdminPage, Empty } from "~/components/admin/ui";
import { Monogram } from "~/components/meta";
import { adminApi, attempt, field } from "~/lib/admin.server";
import type { Author } from "~/lib/types";
import type { Route } from "./+types/authors";

export async function loader({ request }: Route.LoaderArgs) {
  return { authors: await adminApi<(Author & { id: string; articleCount: number })[]>(request, "/authors") };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  return attempt(async () => {
    if (field(form, "intent") !== "delete") return { ok: false, error: "Unknown action.", fields: {} };
    await adminApi(request, `/authors/${field(form, "id")}`, { method: "DELETE" });
    return { ok: true, message: "Author removed." };
  });
}

export default function Authors({ loaderData }: Route.ComponentProps) {
  const { authors } = loaderData;
  return (
    <AdminPage
      title="Authors"
      lede="The bylines readers see. Each author has a public profile page. Authors are separate from admin accounts, so contributors do not need a login."
      actions={
        <Link to="/admin/authors/new" className="button">
          New author
        </Link>
      }
    >
      {authors.length ? (
        <ul className="nr-people">
          {authors.map((a) => (
            <li key={a.id} className="nr-person">
              <Monogram name={a.name} />
              <div className="nr-person__body">
                <Link to={`/admin/authors/${a.id}`} className="nr-person__name">
                  {a.name}
                </Link>
                <p className="nr-person__role">
                  {a.role}
                  {a.location ? `, ${a.location}` : ""}
                </p>
                <p className="nr-person__bio">{a.shortBio}</p>
              </div>
              <div className="nr-person__side">
                <Link to={`/admin/articles?author=${a.id}`} className="nr-link">
                  {a.articleCount} {a.articleCount === 1 ? "story" : "stories"}
                </Link>
                <div className="nr-row-actions">
                  <Link to={`/admin/authors/${a.id}`} className="nr-link">
                    Edit
                  </Link>
                  <a href={`/authors/${a.slug}`} target="_blank" rel="noopener" className="nr-link">
                    Profile
                  </a>
                  <ActionButton
                    intent="delete"
                    values={{ id: a.id }}
                    className="nr-link nr-link--danger"
                    disabled={a.articleCount > 0}
                    confirm={`Remove ${a.name}? Their profile page will disappear.`}
                  >
                    Remove
                  </ActionButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No authors yet.">
          <Link to="/admin/authors/new">Add the first author</Link>
        </Empty>
      )}
    </AdminPage>
  );
}
