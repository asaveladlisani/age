// Check if Temporal is available
if (typeof Temporal === 'undefined') {
  console.error('Temporal API not available! The polyfill may not have loaded.');
  document.body.innerHTML = '<div class="container"><h1>Error</h1><p>Temporal API is required but not loaded. Please check your internet connection and refresh the page.</p></div>';
} else {
  const { PlainDate } = Temporal;
  
  // Rest of the script will be wrapped in this else block
  // -------- Add Person --------
  const form = document.getElementById("personForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const person = {
        sa_id: form.sa_id.value,
        firstName: form.firstName.value,
        surname: form.surname.value
      };

      try {
        const res = await fetch("/add-person", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(person)
        });
        if (res.ok) {
          alert("Person saved successfully!");
          form.reset();
        } else {
          const err = await res.json();
          alert("Error: " + err.error);
        }
      } catch (err) { alert("Network error: " + err.message); }
    });
  }

  // -------- Date Calculations --------
  function parseDate(dateStr) {
        try {
          // Handle SQLite date format (YYYY-MM-DD)
          if (dateStr.includes("T") || dateStr.includes("Z")) {
            return Temporal.Instant
              .from(dateStr)
              .toZonedDateTimeISO("UTC")
              .toPlainDate();
          } else {
            // For SQLite dates, use PlainDate.from
            return Temporal.PlainDate.from(dateStr);
          }
        } catch (err) {
          console.error("Invalid date:", dateStr);
          return null;
        }
      }

  function getDaysUntilBirthday(birthDateStr) {
      try {
        const birth = parseDate(birthDateStr);
        if (!birth) return 0;
        const today = Temporal.Now.plainDateISO();
        let bday = birth.with({ year: today.year });
        if (Temporal.PlainDate.compare(bday, today) < 0) {
          bday = bday.with({ year: today.year + 1 });
        }
        return today.until(bday, { largestUnit: "days" }).days;
      } catch (e) {
        console.error("getDaysUntilBirthday error for:", birthDateStr, e);
        return 0;
      }
    }
  
    function calculateAge(birthDateStr) {
      try {
        const birth = parseDate(birthDateStr);
        if (!birth) return 0;
        const today = Temporal.Now.plainDateISO();
        const age = birth.until(today, { largestUnit: "years" }).years;
        return age < 0 ? 0 : age;
      } catch (e) {
        console.error("calculateAge error for:", birthDateStr, e);
        return 0;
      }
    }
  
    function calculateDaysLived(birthDateStr) {
      try {
        const birth = parseDate(birthDateStr);
        if (!birth) return 0;
        const today = Temporal.Now.plainDateISO();
        const days = birth.until(today, { largestUnit: "days" }).days;
        return days < 0 ? 0 : days;
      } catch (e) {
        console.error("calculateDaysLived error for:", birthDateStr, e);
        return 0;
      }
    }

  function lifeProgress(birthDateStr) {
    const daysLived = calculateDaysLived(birthDateStr);
    const maxDays = 80 * 365;
    return Math.floor((daysLived / maxDays) * 100);
  }

  // -------- Load Dashboard --------
  async function loadPeople() {
    try {
      console.log("loadPeople() called");
      const res = await fetch("/people");
      console.log("API response status:", res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.log("API error response:", errorText);
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const people = await res.json();
      console.log("People data received:", people);
      
      const table = document.getElementById("peopleTable");
      if (!table) {
        console.log("peopleTable element not found!");
        return;
      }
      table.innerHTML = "";
      console.log("Table cleared, processing", people.length, "people");
      
      if (people.length === 0) {
        console.log("No people in database");
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="7" style="text-align:center;">No people found. Add some people first!</td>`;
        table.appendChild(row);
        return;
      }

      let totalAge = 0, totalDays = 0;
      let closestBirthday = 365, nextPerson = "";
      let oldestAge = -1, youngestAge = Infinity, oldestPerson="", youngestPerson="";

      people.forEach(p => {
        try {
          console.log(`Processing person: ${p.first_name} ${p.surname}, birth_date: ${p.birth_date}`);
          const age = calculateAge(p.birth_date);
          const daysLived = calculateDaysLived(p.birth_date);
          const daysUntil = getDaysUntilBirthday(p.birth_date);
          const progress = lifeProgress(p.birth_date);

          totalAge += age;
          totalDays += daysLived;

          if (daysUntil < closestBirthday) { closestBirthday = daysUntil; nextPerson = p.first_name + " " + p.surname; }
          if (age > oldestAge) { oldestAge = age; oldestPerson = p.first_name + " " + p.surname; }
          if (age < youngestAge) { youngestAge = age; youngestPerson = p.first_name + " " + p.surname; }

          const row = document.createElement("tr");
          const birthDateObj = parseDate(p.birth_date);
          const birthDateDisplay = birthDateObj ? birthDateObj.toString() : p.birth_date;
          row.innerHTML = `
            <td>${p.first_name} ${p.surname}</td>
            <td>${birthDateDisplay}</td>
            <td>${age}</td>
            <td>${daysLived.toLocaleString()}</td>
            <td>${daysUntil} days</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${progress}%">${progress}%</div>
              </div>
            </td>
          `;
          table.appendChild(row);
        } catch (personErr) {
          console.error("Error processing person:", p, personErr);
        }
      });

      document.getElementById("totalPeople").innerText = "People stored: " + people.length;
      document.getElementById("averageAge").innerText = "Average age: " + (people.length ? Math.floor(totalAge / people.length) : 0);
      document.getElementById("nextBirthday").innerText = "Next birthday: " + nextPerson + " in " + closestBirthday + " days";
      document.getElementById("oldestAge").innerText = "Oldest: " + oldestPerson + " (" + oldestAge + " years)";
      document.getElementById("youngestAge").innerText = "Youngest: " + youngestPerson + " (" + youngestAge + " years)";
      document.getElementById("totalDaysLived").innerText = "Total days lived: " + totalDays.toLocaleString();

    } catch(err) {
      console.error("Error loading people:", err);
      const table = document.getElementById("peopleTable");
      if (table) {
        table.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error loading data: ${err.message}</td></tr>`;
      }
    }
  }

  // Debug: Log when script loads
  console.log("script.js loaded");

  if (document.getElementById("peopleTable")) {
    console.log("peopleTable element found, calling loadPeople()");
    loadPeople();
  } else {
    console.log("peopleTable element NOT found!");
  }
}

// -------- Add Person --------
const form = document.getElementById("personForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const person = {
      sa_id: form.sa_id.value,
      firstName: form.firstName.value,
      surname: form.surname.value
    };

    try {
      const res = await fetch("/add-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person)
      });
      if (res.ok) {
        alert("Person saved successfully!");
        form.reset();
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (err) { alert("Network error: " + err.message); }
  });
}
// -------- Date Calculations --------
function parseDate(dateStr) {
  try {
    if (dateStr.includes("T") || dateStr.includes("Z")) {
      return Temporal.Instant.from(dateStr).toZonedDateTimeISO("UTC").toPlainDate();
    } else {
      return Temporal.PlainDate.from(dateStr);
    }
  } catch (err) {
    console.error("Invalid date:", dateStr);
    return null;
  }
}

function getDaysUntilBirthday(birthDateStr) {
  const today = Temporal.Now.plainDateISO();
  const birth = parseDate(birthDateStr);
  if (!birth) return 0;
  let bday = birth.with({ year: today.year });
  if (bday < today) bday = bday.with({ year: today.year + 1 });
  return bday.since(today, { largestUnit: "days" }).days;
}

function calculateAge(birthDateStr) {
  const birth = parseDate(birthDateStr);
  if (!birth) return 0;
  const today = Temporal.Now.plainDateISO();
  return birth.until(today, { largestUnit: "years" }).years;
}

function calculateDaysLived(birthDateStr) {
  const birth = parseDate(birthDateStr);
  if (!birth) return 0;
  const today = Temporal.Now.plainDateISO();
  return birth.until(today, { largestUnit: "days" }).days;
}

function lifeProgress(birthDateStr) {
  const daysLived = calculateDaysLived(birthDateStr);
  const maxDays = 80 * 365;
  return Math.floor((daysLived / maxDays) * 100);
}

// -------- Load Dashboard --------
async function loadPeople() {
  try {
    console.log("loadPeople() called");
    const res = await fetch("/people");
    console.log("API response status:", res.status, res.statusText);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("API error response:", errorText);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const people = await res.json();
    console.log("People data received:", people);
    
    const table = document.getElementById("peopleTable");
    if (!table) {
      console.error("peopleTable element not found!");
      return;
    }
    table.innerHTML = "";
    console.log("Table cleared, processing", people.length, "people");
    
    if (people.length === 0) {
      console.log("No people in database");
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7" style="text-align:center;">No people found. Add some people first!</td>`;
      table.appendChild(row);
      return;
    }

    let totalAge = 0, totalDays = 0;
    let closestBirthday = 365, nextPerson = "";
    let oldestAge = -1, youngestAge = Infinity, oldestPerson="", youngestPerson="";

    people.forEach(p => {
      const age = calculateAge(p.birth_date);
      const daysLived = calculateDaysLived(p.birth_date);
      const daysUntil = getDaysUntilBirthday(p.birth_date);
      const progress = lifeProgress(p.birth_date);

      totalAge += age;
      totalDays += daysLived;

      if (daysUntil < closestBirthday) { closestBirthday = daysUntil; nextPerson = p.first_name + " " + p.surname; }
      if (age > oldestAge) { oldestAge = age; oldestPerson = p.first_name + " " + p.surname; }
      if (age < youngestAge) { youngestAge = age; youngestPerson = p.first_name + " " + p.surname; }

      const row = document.createElement("tr");
      row.dataset.id = p.sa_id;
      const birthDateObj = parseDate(p.birth_date);
      const birthDateDisplay = birthDateObj ? birthDateObj.toString() : p.birth_date;
      row.innerHTML = `
        <td>${p.first_name} ${p.surname}</td>
        <td>${birthDateDisplay}</td>
        <td>${age}</td>
        <td>${daysLived.toLocaleString()}</td>
        <td>${daysUntil} days</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress}%">${progress}%</div>
          </div>
        </td>
        <td>
          <button class="delete-btn" data-id="${p.sa_id}">🗑️ Delete</button>
        </td>
      `;
      table.appendChild(row);
    });

    document.getElementById("totalPeople").innerText = "People stored: " + people.length;
    document.getElementById("averageAge").innerText = "Average age: " + (people.length ? Math.floor(totalAge / people.length) : 0);
    document.getElementById("nextBirthday").innerText = "Next birthday: " + nextPerson + " in " + closestBirthday + " days";
    document.getElementById("oldestAge").innerText = "Oldest: " + oldestPerson + " (" + oldestAge + " years)";
    document.getElementById("youngestAge").innerText = "Youngest: " + youngestPerson + " (" + youngestAge + " years)";
    document.getElementById("totalDaysLived").innerText = "Total days lived: " + totalDays.toLocaleString();

  } catch(err) {
    console.error("Error loading people:", err);
  }
}

// -------- Delete Person --------
async function deletePerson(id) {
  if (!confirm("Are you sure you want to delete this person?")) {
    return;
  }

  try {
    const res = await fetch(`/person/${id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      alert("Person deleted successfully!");
      loadPeople(); // Refresh the table
    } else {
      const err = await res.json();
      alert("Error: " + (err.error || "Failed to delete person"));
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

// Event delegation for delete buttons
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    if (id) {
      await deletePerson(id);
    }
  }
});

// Debug: Log when script loads
console.log("script.js loaded");

if (document.getElementById("peopleTable")) {
  console.log("peopleTable element found, calling loadPeople()");
  loadPeople();
} else {
  console.log("peopleTable element NOT found!");
}