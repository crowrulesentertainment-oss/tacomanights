(() => {
  "use strict";
  const config = window.TACOMA_NIGHTS_CONFIG || {};
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  })[char]);
  let db;
  let currentUser;

  async function init() {
    const authNotice = $("#pp-admin-auth");
    const workspace = $("#pp-admin-workspace");
    if (!window.supabase || !config.supabaseUrl || !config.supabaseAnonKey) {
      authNotice.textContent = "Supabase browser configuration is unavailable.";
      return;
    }

    db = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    const sessionResult = await db.auth.getSession();
    const session = sessionResult.data.session;
    if (!session) {
      authNotice.textContent = "Sign in with your Tacoma Nights membership, then return here. Staff permissions are required.";
      return;
    }

    currentUser = session.user;
    const membershipResult = await db.from("tn_memberships")
      .select("role,status,display_name")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    const member = membershipResult.data;
    if (membershipResult.error || !member || member.status !== "active" ||
        !["administrator", "producer", "editor", "moderator"].includes(member.role)) {
      authNotice.textContent = "Access denied. This desk is limited to active Tacoma Nights producers, editors, moderators and administrators.";
      return;
    }

    authNotice.textContent = "Authorized · " + (member.display_name || currentUser.email) + " · " + member.role;
    workspace.hidden = false;
    $("#pp-question-form").addEventListener("submit", createQuestion);
    $("#pp-refresh").addEventListener("click", loadSubmissions);
    await Promise.all([loadQuestions(), loadSubmissions()]);
  }

  async function createQuestion(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const status = $("#pp-question-status");
    status.textContent = "Saving draft…";
    const result = await db.from("tn_weekly_questions").insert({
      slug: "question-" + Date.now(),
      question: values.question,
      context: values.context || "",
      status: "draft",
      created_by: currentUser.id
    });
    status.textContent = result.error ? result.error.message : "Draft created. Activate it after review.";
    if (!result.error) {
      event.currentTarget.reset();
      await loadQuestions();
    }
  }

  async function loadQuestions() {
    const host = $("#pp-active-question");
    const result = await db.from("tn_weekly_questions")
      .select("id,question,context,status")
      .in("status", ["active", "draft", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (result.error) {
      host.textContent = result.error.message;
      return;
    }
    host.replaceChildren();
    if (!result.data?.length) {
      host.textContent = "No questions yet.";
      return;
    }
    for (const question of result.data) {
      const card = document.createElement("div");
      card.className = "content-card";
      card.innerHTML = '<span class="tag">' + escapeHtml(question.status.toUpperCase()) +
        '</span><h3>' + escapeHtml(question.question) + '</h3><p>' +
        escapeHtml(question.context) + '</p>';
      if (question.status !== "active") {
        const button = document.createElement("button");
        button.className = "tn2-btn tn2-btn-red";
        button.textContent = "Activate question";
        button.addEventListener("click", () => activateQuestion(question.id));
        card.append(button);
      }
      host.append(card);
    }
  }

  async function activateQuestion(id) {
    const close = await db.from("tn_weekly_questions")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("status", "active");
    if (close.error) {
      $("#pp-admin-status").textContent = close.error.message;
      return;
    }
    const open = await db.from("tn_weekly_questions")
      .update({ status: "active", opens_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    $("#pp-admin-status").textContent = open.error?.message || "Question activated.";
    await loadQuestions();
  }

  async function loadSubmissions() {
    const host = $("#pp-submissions");
    host.textContent = "Loading…";
    const result = await db.from("tn_submissions")
      .select("id,submitter_name,title,message,metadata,status,created_at")
      .eq("submission_type", "community-submit")
      .contains("metadata", { category: "peoples_perspective" })
      .order("created_at", { ascending: false })
      .limit(100);
    if (result.error) {
      host.textContent = result.error.message;
      return;
    }
    host.replaceChildren();
    if (!result.data?.length) {
      host.innerHTML = '<p class="tn2-footer-note">No People’s Perspective submissions are waiting for review.</p>';
      return;
    }

    for (const item of result.data) {
      const card = document.createElement("article");
      card.className = "tn2-crew-card";
      const mediaPath = item.metadata?.object_path;
      const mediaType = item.metadata?.media_type || "written";
      card.innerHTML = '<span class="tn2-card-tag">' + escapeHtml(mediaType.toUpperCase()) +
        ' · ' + escapeHtml(item.status.toUpperCase()) + '</span><h3>' +
        escapeHtml(item.title || "Community response") + '</h3><p>' +
        escapeHtml(item.submitter_name || "Name not provided") + ' · ' +
        new Date(item.created_at).toLocaleString() + '</p><p>' +
        escapeHtml(item.message) + '</p>';

      if (mediaPath) {
        const signed = await db.storage.from("tn-community-submissions").createSignedUrl(mediaPath, 600);
        if (!signed.error && signed.data?.signedUrl) {
          const preview = document.createElement(mediaType === "video" ? "video" : mediaType === "audio" ? "audio" : "img");
          preview.src = signed.data.signedUrl;
          if (mediaType === "video" || mediaType === "audio") preview.controls = true;
          else preview.alt = "Private submission preview";
          preview.style.width = "100%";
          card.append(preview);
        } else {
          const note = document.createElement("p");
          note.textContent = "Private media preview unavailable: " + (signed.error?.message || "missing object");
          card.append(note);
        }
      }

      const actions = document.createElement("div");
      actions.className = "manager-actions";
      for (const [label, nextStatus] of [
        ["Mark in review", "in_review"], ["Approve", "approved"], ["Reject", "rejected"]
      ]) {
        const button = document.createElement("button");
        button.className = "tn2-btn " + (nextStatus === "rejected" ? "tn2-btn-outline" : "tn2-btn-red");
        button.textContent = label;
        button.addEventListener("click", () => updateSubmission(item.id, nextStatus));
        actions.append(button);
      }
      card.append(actions);
      host.append(card);
    }
  }

  async function updateSubmission(id, status) {
    const result = await db.from("tn_submissions").update({
      status,
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString()
    }).eq("id", id);
    $("#pp-admin-status").textContent = result.error?.message ||
      "Submission status updated. Public publication still requires editorial selection and a separate release check.";
    if (!result.error) await loadSubmissions();
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      $("#pp-admin-auth").textContent = "Unable to initialize moderation desk: " + error.message;
      console.error(error);
    });
  });
})();