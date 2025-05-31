document.addEventListener("DOMContentLoaded", async function () {
    const loginBtn = document.querySelector(".auth-buttons button:nth-child(1)");
    const signupBtn = document.querySelector(".auth-buttons button:nth-child(2)");

    try {
        // Check if user session exists
        const sessionResponse = await fetch("/check-session");
        const sessionData = await sessionResponse.json();

        if (sessionData.loggedIn) {
            // User is logged in → Change login button to logout
            loginBtn.textContent = "Logout";
            loginBtn.classList.add("logout");
            loginBtn.classList.remove("login");

            loginBtn.addEventListener("click", async function () {
                let confirmLogout = confirm("Are you sure you want to log out?");
                if (confirmLogout) {
                    try {
                        const response = await fetch("/logout", { method: "POST" });
                        const data = await response.json();

                        if (data.success) {
                            alert("You have been logged out successfully.");
                            window.location.href = "index.html"; // Redirect to index page
                        }
                    } catch (error) {
                        console.error("Logout error:", error);
                    }
                }
            });
        } else {
            // User is not logged in → Ensure buttons function correctly
            loginBtn.addEventListener("click", function () {
                window.location.href = "login.html"; // Redirect to login page
            });

            signupBtn.addEventListener("click", function () {
                window.location.href = "sign.html"; // Redirect to signup page
            });
        }
    } catch (error) {
        console.error("Error checking session:", error);
    }
});
