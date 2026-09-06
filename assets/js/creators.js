/* =========================================================
   CROWRULES CREATORS HUB v1.1
   APPLICATION LOGIC
   ========================================================= */

const BUCKET =
  window.CROWRULES_CONFIG.STORAGE_BUCKET;


/* =========================================================
   UTILITIES
   ========================================================= */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  [...document.querySelectorAll(selector)];


function escapeHTML(value = "") {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatDate(date) {

  if (!date) return "—";

  return new Intl.DateTimeFormat(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  ).format(new Date(date));
}


function formatNumber(value) {

  return Number(value || 0)
    .toLocaleString();
}


function toast(message, type = "info") {

  let box = $("#toast");

  if (!box) {

    box = document.createElement("div");

    box.id = "toast";

    box.className = "toast";

    document.body.appendChild(box);
  }

  box.className =
    `toast ${type}`;

  box.textContent =
    message;

  box.classList.add("show");

  setTimeout(() => {

    box.classList.remove("show");

  }, 3500);
}


function getParam(name) {

  return new URLSearchParams(
    window.location.search
  ).get(name);
}


/* =========================================================
   PUBLIC CREATOR DIRECTORY
   ========================================================= */

async function loadCreators() {

  const container =
    $("#creatorGrid");

  if (!container) return;

  container.innerHTML =
    `<div class="loading">Loading creators...</div>`;

  const { data, error } =
    await crDB
      .from("creator_profiles")
      .select("*")
      .eq("status", "active")
      .order("display_name");

  if (error) {

    container.innerHTML =
      `<div class="error">
        ${escapeHTML(error.message)}
      </div>`;

    return;
  }

  if (!data?.length) {

    container.innerHTML =
      `<div class="empty">
        No creators have been published yet.
      </div>`;

    return;
  }

  container.innerHTML =
    data.map(creator => `

      <article class="creator-card">

        <div class="creator-avatar">

          ${
            creator.avatar_url
              ? `<img src="${escapeHTML(creator.avatar_url)}"
                      alt="">`
              : `<span>
                  ${escapeHTML(
                    creator.display_name
                      ?.charAt(0)
                      ?.toUpperCase() || "C"
                  )}
                 </span>`
          }

        </div>

        <div class="creator-card-body">

          <div class="eyebrow">
            ${escapeHTML(
              creator.creator_type || "Creator"
            )}
          </div>

          <h3>
            ${escapeHTML(
              creator.display_name
            )}
          </h3>

          <p class="handle">
            @${escapeHTML(
              creator.handle
            )}
          </p>

          <p>
            ${escapeHTML(
              creator.bio || "CrowRules creator."
            )}
          </p>

          <a
            class="btn"
            href="creator.html?handle=${encodeURIComponent(
              creator.handle
            )}">
            View Creator
          </a>

        </div>

      </article>

    `).join("");
}


/* =========================================================
   PUBLIC CREATOR PROFILE
   ========================================================= */

async function loadCreatorProfile() {

  const handle =
    getParam("handle");

  const id =
    getParam("id");

  if (!handle && !id) return;

  let query =
    crDB
      .from("creator_profiles")
      .select("*");

  if (handle) {

    query =
      query.eq("handle", handle);

  } else {

    query =
      query.eq("id", id);
  }

  const {
    data: creator,
    error
  } = await query.maybeSingle();

  if (error || !creator) {

    $("#creatorProfile").innerHTML =
      `<div class="error">
        Creator not found.
      </div>`;

    return;
  }

  $("#creatorName").textContent =
    creator.display_name;

  $("#creatorHandle").textContent =
    `@${creator.handle}`;

  $("#creatorBio").textContent =
    creator.bio || "No bio yet.";

  $("#creatorType").textContent =
    creator.creator_type || "Creator";

  if (creator.banner_url) {

    $("#creatorBanner").style.backgroundImage =
      `url("${creator.banner_url}")`;
  }

  if (creator.avatar_url) {

    $("#creatorAvatar").src =
      creator.avatar_url;

    $("#creatorAvatar").hidden =
      false;
  }

  const user =
    await CRAuth.user();

  const followButton =
    $("#followButton");

  if (followButton && user) {

    const {
      data: follow
    } = await crDB
      .from("creator_follows")
      .select("creator_id")
      .eq("creator_id", creator.id)
      .eq("follower_id", user.id)
      .maybeSingle();

    followButton.textContent =
      follow
        ? "Following"
        : "Follow";

    followButton.onclick =
      () =>
        toggleFollow(
          creator.id,
          !!follow
        );
  }

  await loadCreatorContent(
    creator.id
  );
}


/* =========================================================
   CREATOR CONTENT
   ========================================================= */

async function loadCreatorContent(
  creatorId
) {

  const container =
    $("#creatorContent");

  if (!container) return;

  const { data, error } =
    await crDB
      .from("creator_content")
      .select("*")
      .eq("creator_id", creatorId)
      .eq("status", "published")
      .eq("visibility", "public")
      .order(
        "published_at",
        { ascending: false }
      );

  if (error) {

    container.innerHTML =
      `<div class="error">
        ${escapeHTML(error.message)}
      </div>`;

    return;
  }

  if (!data?.length) {

    container.innerHTML =
      `<div class="empty">
        No published content yet.
      </div>`;

    return;
  }

  container.innerHTML =
    data.map(item => `

      <article class="content-card">

        <div class="content-thumb">

          ${
            item.thumbnail_url
              ? `<img src="${escapeHTML(
                    item.thumbnail_url
                  )}" alt="">`
              : `<span>CR</span>`
          }

        </div>

        <div>

          <div class="eyebrow">
            ${escapeHTML(
              item.content_type
            )}
          </div>

          <h3>
            ${escapeHTML(item.title)}
          </h3>

          <p>
            ${escapeHTML(
              item.description || ""
            )}
          </p>

          <small>
            ${formatDate(
              item.published_at
            )}
            ·
            ${formatNumber(item.views)}
            views
          </small>

        </div>

      </article>

    `).join("");
}


/* =========================================================
   FOLLOW SYSTEM
   ========================================================= */

async function toggleFollow(
  creatorId,
  currentlyFollowing
) {

  const user =
    await CRAuth.requireUser();

  if (!user) return;

  if (currentlyFollowing) {

    const { error } =
      await crDB
        .from("creator_follows")
        .delete()
        .eq("creator_id", creatorId)
        .eq("follower_id", user.id);

    if (error) {

      toast(
        error.message,
        "error"
      );

      return;
    }

    toast(
      "Creator unfollowed.",
      "success"
    );

  } else {

    const { error } =
      await crDB
        .from("creator_follows")
        .insert({
          creator_id: creatorId,
          follower_id: user.id
        });

    if (error) {

      toast(
        error.message,
        "error"
      );

      return;
    }

    toast(
      "Now following creator.",
      "success"
    );
  }

  await loadCreatorProfile();
}


/* =========================================================
   APPLICATION
   ========================================================= */

async function submitApplication(event) {

  event.preventDefault();

  const user =
    await CRAuth.requireUser();

  if (!user) return;

  const form =
    event.currentTarget;

  const formData =
    new FormData(form);

  const payload = {

    user_id:
      user.id,

    display_name:
      formData.get("display_name"),

    handle:
      formData.get("handle"),

    email:
      user.email,

    creator_type:
      formData.get("creator_type"),

    bio:
      formData.get("bio"),

    portfolio_url:
      formData.get("portfolio_url"),

    proposal:
      formData.get("proposal"),

    status:
      "pending"
  };

  const { error } =
    await crDB
      .from("creator_applications")
      .insert(payload);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  toast(
    "Application submitted.",
    "success"
  );

  form.reset();
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

  const user =
    await CRAuth.requireUser();

  if (!user) return;

  const profile =
    await CRAuth.creatorProfile(
      user.id
    );

  if (!profile) {

    $("#dashboardMessage").innerHTML =
      `
      <div class="notice">
        Your creator profile has not been created yet.
      </div>
      `;

    return;
  }

  if ($("#dashboardName")) {

    $("#dashboardName").textContent =
      profile.display_name;
  }

  if ($("#dashboardHandle")) {

    $("#dashboardHandle").textContent =
      `@${profile.handle}`;
  }

  const {
    count: contentCount
  } = await crDB
    .from("creator_content")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("creator_id", user.id);

  const {
    count: followerCount
  } = await crDB
    .from("creator_follows")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("creator_id", user.id);

  const {
    count: liveCount
  } = await crDB
    .from("creator_live_events")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("creator_id", user.id);

  $("#metricContent").textContent =
    formatNumber(contentCount);

  $("#metricFollowers").textContent =
    formatNumber(followerCount);

  $("#metricLive").textContent =
    formatNumber(liveCount);

  await loadDashboardContent(
    user.id
  );
}


/* =========================================================
   DASHBOARD CONTENT
   ========================================================= */

async function loadDashboardContent(
  creatorId
) {

  const container =
    $("#dashboardContent");

  if (!container) return;

  const { data, error } =
    await crDB
      .from("creator_content")
      .select("*")
      .eq("creator_id", creatorId)
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {

    container.innerHTML =
      `<div class="error">
        ${escapeHTML(error.message)}
      </div>`;

    return;
  }

  container.innerHTML =
    (data || []).map(item => `

      <tr>

        <td>
          ${escapeHTML(item.title)}
        </td>

        <td>
          ${escapeHTML(item.content_type)}
        </td>

        <td>
          <span class="status status-${item.status}">
            ${escapeHTML(item.status)}
          </span>
        </td>

        <td>
          ${formatNumber(item.views)}
        </td>

        <td>
          ${formatDate(item.created_at)}
        </td>

      </tr>

    `).join("");
}


/* =========================================================
   CONTENT CREATION
   ========================================================= */

async function uploadCreatorFile(
  file,
  folder
) {

  const user =
    await CRAuth.requireUser();

  if (!user) return null;

  if (!file) return null;

  const safeName =
    file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-");

  const path =
    `${user.id}/${folder}/${crypto.randomUUID()}-${safeName}`;

  const { error } =
    await crDB
      .storage
      .from(BUCKET)
      .upload(
        path,
        file,
        {
          upsert: false,
          contentType:
            file.type || undefined
        }
      );

  if (error) {

    throw error;
  }

  return path;
}


async function createContent(event) {

  event.preventDefault();

  const user =
    await CRAuth.requireUser();

  if (!user) return;

  const form =
    event.currentTarget;

  const fd =
    new FormData(form);

  const profile =
    await CRAuth.creatorProfile(
      user.id
    );

  if (!profile) {

    toast(
      "Creator profile required.",
      "error"
    );

    return;
  }

  const mediaFile =
    $("#mediaFile")?.files?.[0];

  const thumbnailFile =
    $("#thumbnailFile")?.files?.[0];

  let mediaPath =
    null;

  let thumbnailPath =
    null;

  try {

    if (mediaFile) {

      mediaPath =
        await uploadCreatorFile(
          mediaFile,
          "media"
        );
    }

    if (thumbnailFile) {

      thumbnailPath =
        await uploadCreatorFile(
          thumbnailFile,
          "thumbnails"
        );
    }

    const payload = {

      creator_id:
        profile.id,

      title:
        fd.get("title"),

      description:
        fd.get("description"),

      content_type:
        fd.get("content_type"),

      status:
        fd.get("status") || "draft",

      media_url:
        mediaPath,

      thumbnail_url:
        thumbnailPath,

      category:
        fd.get("category"),

      tags:
        fd.get("tags")
          ?.split(",")
          .map(x => x.trim())
          .filter(Boolean),

      visibility:
        fd.get("visibility") || "public",

      published_at:
        fd.get("status") === "published"
          ? new Date().toISOString()
          : null
    };

    const { error } =
      await crDB
        .from("creator_content")
        .insert(payload);

    if (error) throw error;

    toast(
      "Content created.",
      "success"
    );

    form.reset();

  } catch (error) {

    toast(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   LIVE EVENTS
   ========================================================= */

async function loadLiveEvents() {

  const container =
    $("#liveEvents");

  if (!container) return;

  const { data, error } =
    await crDB
      .from("creator_live_events")
      .select(`
        *,
        creator_profiles (
          display_name,
          handle
        )
      `)
      .in(
        "status",
        ["scheduled", "live"]
      )
      .order(
        "starts_at",
        { ascending: true }
      );

  if (error) {

    container.innerHTML =
      `<div class="error">
        ${escapeHTML(error.message)}
      </div>`;

    return;
  }

  container.innerHTML =
    (data || []).map(event => `

      <article class="live-card">

        <div class="live-status">
          ${escapeHTML(event.status)}
        </div>

        <h3>
          ${escapeHTML(event.title)}
        </h3>

        <p>
          ${escapeHTML(
            event.description || ""
          )}
        </p>

        <p>
          <strong>
            ${escapeHTML(
              event.creator_profiles?.display_name ||
              "Creator"
            )}
          </strong>
        </p>

        <time>
          ${formatDate(event.starts_at)}
        </time>

        ${
          event.youtube_url
            ? `
              <a
                class="btn"
                target="_blank"
                rel="noopener"
                href="${escapeHTML(
                  event.youtube_url
                )}">
                Watch
              </a>
            `
            : ""
        }

      </article>

    `).join("");
}


/* =========================================================
   CREATE LIVE EVENT
   ========================================================= */

async function createLiveEvent(event) {

  event.preventDefault();

  const user =
    await CRAuth.requireUser();

  if (!user) return;

  const fd =
    new FormData(
      event.currentTarget
    );

  const payload = {

    creator_id:
      user.id,

    title:
      fd.get("title"),

    description:
      fd.get("description"),

    starts_at:
      fd.get("starts_at"),

    ends_at:
      fd.get("ends_at") || null,

    status:
      "scheduled",

    youtube_url:
      fd.get("youtube_url"),

    twitch_url:
      fd.get("twitch_url"),

    kick_url:
      fd.get("kick_url"),

    stream_url:
      fd.get("stream_url")
  };

  const { error } =
    await crDB
      .from("creator_live_events")
      .insert(payload);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  toast(
    "Live event scheduled.",
    "success"
  );

  event.currentTarget.reset();

  await loadLiveEvents();
}


/* =========================================================
   ANALYTICS
   ========================================================= */

async function loadAnalytics() {

  const user =
    await CRAuth.requireUser();

  if (!user) return;

  const { data, error } =
    await crDB
      .from("creator_analytics_daily")
      .select("*")
      .eq("creator_id", user.id)
      .order(
        "metric_date",
        { ascending: true }
      );

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  const totals =
    (data || []).reduce(
      (acc, row) => {

        acc.views +=
          Number(row.views || 0);

        acc.watch_seconds +=
          Number(row.watch_seconds || 0);

        acc.followers +=
          Number(row.followers_gained || 0);

        acc.likes +=
          Number(row.likes || 0);

        acc.comments +=
          Number(row.comments || 0);

        acc.shares +=
          Number(row.shares || 0);

        return acc;

      },
      {
        views: 0,
        watch_seconds: 0,
        followers: 0,
        likes: 0,
        comments: 0,
        shares: 0
      }
    );

  if ($("#analyticsViews"))
    $("#analyticsViews").textContent =
      formatNumber(totals.views);

  if ($("#analyticsWatch"))
    $("#analyticsWatch").textContent =
      Math.round(
        totals.watch_seconds / 3600
      ) + "h";

  if ($("#analyticsFollowers"))
    $("#analyticsFollowers").textContent =
      formatNumber(
        totals.followers
      );

  if ($("#analyticsEngagement"))
    $("#analyticsEngagement").textContent =
      formatNumber(
        totals.likes +
        totals.comments +
        totals.shares
      );

  renderAnalyticsTable(data || []);
}


/* =========================================================
   ANALYTICS TABLE
   ========================================================= */

function renderAnalyticsTable(data) {

  const container =
    $("#analyticsTable");

  if (!container) return;

  container.innerHTML =
    data.map(row => `

      <tr>

        <td>
          ${formatDate(row.metric_date)}
        </td>

        <td>
          ${formatNumber(row.views)}
        </td>

        <td>
          ${Math.round(
            Number(
              row.watch_seconds || 0
            ) / 60
          )}m
        </td>

        <td>
          ${formatNumber(
            row.followers_gained
          )}
        </td>

        <td>
          ${formatNumber(row.likes)}
        </td>

      </tr>

    `).join("");
}


/* =========================================================
   ADMIN APPLICATIONS
   ========================================================= */

async function loadAdminApplications() {

  const user =
    await CRAuth.requireUser();

  if (!user) return;

  const { data, error } =
    await crDB
      .from("creator_applications")
      .select("*")
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {

    $("#adminApplications").innerHTML =
      `<div class="error">
        ${escapeHTML(error.message)}
      </div>`;

    return;
  }

  $("#adminApplications").innerHTML =
    (data || []).map(application => `

      <article class="admin-card">

        <div>

          <span class="status status-${application.status}">
            ${escapeHTML(
              application.status
            )}
          </span>

          <h3>
            ${escapeHTML(
              application.display_name
            )}
          </h3>

          <p>
            @${escapeHTML(
              application.handle
            )}
          </p>

          <p>
            ${escapeHTML(
              application.bio || ""
            )}
          </p>

          <small>
            ${formatDate(
              application.created_at
            )}
          </small>

        </div>

        <div class="admin-actions">

          ${
            application.status === "pending"
              ? `
                <button
                  class="btn"
                  onclick="approveApplication('${application.id}')">
                  Approve
                </button>

                <button
                  class="btn btn-danger"
                  onclick="declineApplication('${application.id}')">
                  Decline
                </button>
              `
              : ""
          }

        </div>

      </article>

    `).join("");
}


/* =========================================================
   ADMIN APPROVAL
   ========================================================= */

async function approveApplication(
  applicationId
) {

  const {
    data: application,
    error
  } = await crDB
    .from("creator_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  const { error: profileError } =
    await crDB
      .from("creator_profiles")
      .upsert({
        id: application.user_id,
        handle: application.handle,
        display_name:
          application.display_name,
        bio: application.bio,
        creator_type:
          application.creator_type,
        website_url:
          application.portfolio_url,
        status: "active"
      });

  if (profileError) {

    toast(
      profileError.message,
      "error"
    );

    return;
  }

  const { error: applicationError } =
    await crDB
      .from("creator_applications")
      .update({
        status: "approved",
        reviewed_at:
          new Date().toISOString()
      })
      .eq("id", applicationId);

  if (applicationError) {

    toast(
      applicationError.message,
      "error"
    );

    return;
  }

  toast(
    "Creator approved.",
    "success"
  );

  await loadAdminApplications();
}


async function declineApplication(
  applicationId
) {

  const { error } =
    await crDB
      .from("creator_applications")
      .update({
        status: "declined",
        reviewed_at:
          new Date().toISOString()
      })
      .eq("id", applicationId);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  toast(
    "Application declined.",
    "success"
  );

  await loadAdminApplications();
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginForm(event) {

  event.preventDefault();

  const fd =
    new FormData(
      event.currentTarget
    );

  try {

    await CRAuth.signIn(
      fd.get("email"),
      fd.get("password")
    );

    const next =
      new URLSearchParams(
        window.location.search
      ).get("next");

    window.location.href =
      next
        ? decodeURIComponent(next)
        : "dashboard.html";

  } catch (error) {

    toast(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   SIGNUP
   ========================================================= */

async function signupForm(event) {

  event.preventDefault();

  const fd =
    new FormData(
      event.currentTarget
    );

  try {

    const data =
      await CRAuth.signUp(
        fd.get("email"),
        fd.get("password"),
        {
          display_name:
            fd.get("display_name"),

          handle:
            fd.get("handle")
        }
      );

    if (data.session) {

      await CRAuth.ensureCreatorProfile();

      window.location.href =
        "dashboard.html";

    } else {

      toast(
        "Check your email to confirm your account.",
        "success"
      );
    }

  } catch (error) {

    toast(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   PAGE INITIALIZER
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    const page =
      document.body.dataset.page;

    switch (page) {

      case "home":
        await loadCreators();
        await loadLiveEvents();
        break;

      case "creator":
        await loadCreatorProfile();
        break;

      case "dashboard":
        await loadDashboard();
        break;

      case "studio":
        await CRAuth.requireUser();
        break;

      case "live":
        await loadLiveEvents();
        break;

      case "analytics":
        await loadAnalytics();
        break;

      case "admin":
        await loadAdminApplications();
        break;
    }

    $$("[data-signout]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => CRAuth.signOut()
        );

      });

    const login =
      $("#loginForm");

    if (login)
      login.addEventListener(
        "submit",
        loginForm
      );

    const signup =
      $("#signupForm");

    if (signup)
      signup.addEventListener(
        "submit",
        signupForm
      );

    const application =
      $("#applicationForm");

    if (application)
      application.addEventListener(
        "submit",
        submitApplication
      );

    const content =
      $("#contentForm");

    if (content)
      content.addEventListener(
        "submit",
        createContent
      );

    const live =
      $("#liveForm");

    if (live)
      live.addEventListener(
        "submit",
        createLiveEvent
      );
  }
);