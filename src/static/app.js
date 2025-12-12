document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: safely produce initials from a name/email
  function getInitials(text) {
    if (!text) return "";
    // prefer name-like parts first; handle emails
    const t = String(text);
    const beforeAt = t.split("@")[0];
    const words = beforeAt.split(/[\s._-]+/).filter(Boolean);
    if (words.length === 0) return t.slice(0, 2).toUpperCase();
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear existing options except the placeholder
      Array.from(activitySelect.options).forEach((opt) => {
        if (opt.value !== "") {
          opt.remove();
        }
      });

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
        `;

        // Participants section
        const participantsContainer = document.createElement("div");
        participantsContainer.className = "participants";

        const participantsHeader = document.createElement("h5");
        participantsHeader.textContent = "Participants";
        participantsContainer.appendChild(participantsHeader);

        if (!details.participants || details.participants.length === 0) {
          const empty = document.createElement("p");
          empty.className = "participants-empty";
          empty.textContent = "No participants yet — be the first!";
          participantsContainer.appendChild(empty);
        } else {
          const list = document.createElement("ul");
          list.className = "participant-list";
          details.participants.forEach((p) => {
            // Support participant string or object
            const participantText =
              typeof p === "string" ? p : p.name || p.email || JSON.stringify(p);

            const li = document.createElement("li");
            li.className = "participant-item";

            const badge = document.createElement("span");
            badge.className = "participant-badge";
            badge.textContent = getInitials(participantText);

            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = participantText;

            li.appendChild(badge);
            li.appendChild(nameSpan);

            // Add delete/unregister button for each participant
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "participant-delete";
            deleteBtn.title = "Unregister participant";
            deleteBtn.setAttribute("aria-label", `Unregister ${participantText}`);
            deleteBtn.textContent = "✖";

            // Handle click to unregister participant
            deleteBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!confirm(`Unregister ${participantText} from ${name}?`)) return;

              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(
                    participantText
                  )}`,
                  { method: "DELETE" }
                );

                const json = await resp.json();
                if (resp.ok) {
                  // Remove the element from the DOM
                  li.remove();

                  // Update spots left count in the card
                  const spotsEl = activityCard.querySelector(".spots-left");
                  if (spotsEl) {
                    const newVal = parseInt(spotsEl.textContent, 10) + 1;
                    spotsEl.textContent = newVal;
                  }

                  // If list now empty, show empty message
                  if (list.children.length === 0) {
                    const empty = document.createElement("p");
                    empty.className = "participants-empty";
                    empty.textContent = "No participants yet — be the first!";
                    participantsContainer.replaceChild(empty, list);
                  }
                } else {
                  messageDiv.textContent = json.detail || "Failed to unregister";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                }
              } catch (err) {
                console.error("Error unregistering:", err);
                messageDiv.textContent = "Failed to unregister. Please try again.";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                setTimeout(() => messageDiv.classList.add("hidden"), 5000);
              }
            });

            li.appendChild(deleteBtn);
            list.appendChild(li);
          });

          participantsContainer.appendChild(list);
        }

        activityCard.appendChild(participantsContainer);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities to reflect the newly registered participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
