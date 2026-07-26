import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jiraApi } from "../api/jira";

export default function Integrations() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const { data: connection, isLoading } = useQuery({
    queryKey: ["jira-connection"],
    queryFn: jiraApi.getConnection,
  });

  // The OAuth callback bounces back here with the outcome as query params.
  useEffect(() => {
    const status = searchParams.get("jira");
    if (!status) return;
    if (status === "connected") {
      setBanner({ kind: "success", text: "JIRA connected. Your Atlassian account is now linked." });
    } else {
      setBanner({ kind: "error", text: searchParams.get("message") ?? "Could not connect to JIRA." });
    }
    queryClient.invalidateQueries({ queryKey: ["jira-connection"] });
    queryClient.invalidateQueries({ queryKey: ["jira-tasks"] });
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, queryClient]);

  const connectMutation = useMutation({
    mutationFn: jiraApi.getAuthorizeUrl,
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err: any) => {
      setBanner({
        kind: "error",
        text: err?.response?.data?.detail ?? "Could not start the Atlassian sign-in.",
      });
      setShowSetup(true);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: jiraApi.disconnect,
    onSuccess: () => {
      setBanner({ kind: "success", text: "JIRA disconnected." });
      queryClient.invalidateQueries({ queryKey: ["jira-connection"] });
      queryClient.invalidateQueries({ queryKey: ["jira-tasks"] });
    },
  });

  const isOauth = connection?.auth_method === "oauth";
  const isApiToken = connection?.auth_method === "api_token";

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Integrations</h1>
      <p className="mb-6 text-sm text-slate-500">
        Connect the tools this assistant pulls from. Signing in with Atlassian is all that's needed for
        JIRA — no API tokens to copy.
      </p>

      {banner && (
        <div
          className={
            banner.kind === "success"
              ? "mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              : "mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
          }
        >
          {banner.text}
        </div>
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">JIRA Cloud</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pull your open issues into meetings and link them to action items.
            </p>
          </div>
          {isLoading ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              Checking...
            </span>
          ) : connection?.connected ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Connected
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              Not connected
            </span>
          )}
        </div>

        {isOauth && (
          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Site</dt>
              <dd className="text-slate-800">
                {connection?.site_url ? (
                  <a
                    href={connection.site_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    {connection.site_name ?? connection.site_url}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Signed in as</dt>
              <dd className="text-slate-800">
                {connection?.account_name ?? connection?.account_email ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Connected</dt>
              <dd className="text-slate-800">
                {connection?.connected_at ? new Date(connection.connected_at).toLocaleString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Project filter</dt>
              <dd className="text-slate-800">{connection?.project_key ?? "All projects"}</dd>
            </div>
          </dl>
        )}

        {isApiToken && (
          <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Currently using the API token in <code>backend/.env</code> for{" "}
            {connection?.account_email ?? "an unknown account"}. Connect with Atlassian below to switch to
            sign-in based access — it takes priority over the token once connected.
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {connectMutation.isPending
              ? "Redirecting..."
              : isOauth
                ? "Reconnect with Atlassian"
                : "Connect with Atlassian"}
          </button>
          {isOauth && (
            <button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Disconnect
            </button>
          )}
          <button
            onClick={() => setShowSetup((v) => !v)}
            className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            {showSetup ? "Hide setup help" : "One-time setup help"}
          </button>
        </div>

        {!connection?.oauth_available && !isLoading && (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Atlassian sign-in needs a one-time OAuth app registration before the button above will work.
            See the setup steps.
          </p>
        )}

        {showSetup && (
          <div className="mt-5 border-t border-slate-100 pt-5 text-sm text-slate-600">
            <p className="mb-3 font-medium text-slate-800">One-time setup (only needed once per team)</p>
            <ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed">
              <li>
                Go to{" "}
                <a
                  href="https://developer.atlassian.com/console/myapps/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  developer.atlassian.com/console/myapps
                </a>{" "}
                and create an app, then enable <strong>OAuth 2.0 (3LO)</strong>.
              </li>
              <li>
                Under <strong>Permissions</strong>, add the <em>Jira API</em> with the{" "}
                <code>read:jira-work</code> and <code>read:jira-user</code> scopes.
              </li>
              <li>
                Under <strong>Authorization</strong>, set the callback URL to:
                <code className="mt-1 block rounded bg-slate-100 px-2 py-1">
                  {connection?.redirect_uri ?? "http://localhost:8000/api/jira/oauth/callback"}
                </code>
              </li>
              <li>
                Copy the Client ID and Secret from <strong>Settings</strong> into{" "}
                <code>backend/.env</code> as <code>JIRA_CLIENT_ID</code> and{" "}
                <code>JIRA_CLIENT_SECRET</code>, then restart the backend.
              </li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              After that, anyone using this app just clicks Connect with Atlassian and signs in normally.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
