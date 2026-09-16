//Employee profile menu and user session
//Displays the signed-in user and controls the profile and logout menu.

//Load the user name and manage profile-menu interactions.
(() => {
    const profileMenu = document.querySelector('.profile-menu');
    const profileButton = profileMenu?.querySelector('.profile-button');
    const profileDropdown = profileMenu?.querySelector('.profile-dropdown');
    const profileNames = document.querySelectorAll('[data-profile-name]');

    fetch('/api/current-user')
        .then((response) => response.ok ? response.json() : null)
        .then((user) => {
            if (user?.name) profileNames.forEach((element) => { element.textContent = user.name; });
        })
        .catch(() => {});

    const closeProfileMenu = () => {
        if (!profileDropdown || !profileButton) return;
        profileDropdown.hidden = true;
        profileButton.setAttribute('aria-expanded', 'false');
    };

    profileButton?.addEventListener('click', () => {
        const isOpen = !profileDropdown.hidden;
        profileDropdown.hidden = isOpen;
        profileButton.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.profile-menu')) closeProfileMenu();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeProfileMenu();
            profileButton?.focus();
        }
    });
})();
