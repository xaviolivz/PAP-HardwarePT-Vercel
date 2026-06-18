function toggleMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuToggle = document.querySelector('.menu-toggle');
    const body = document.body;
    
    if (sideMenu && menuOverlay && menuToggle) {
        sideMenu.classList.toggle('active');
        menuOverlay.classList.toggle('active');
        menuToggle.classList.toggle('active');
        body.classList.toggle('menu-open');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const menuLinks = document.querySelectorAll('.side-menu-list a');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            setTimeout(() => {
                const sideMenu = document.getElementById('sideMenu');
                if (sideMenu && sideMenu.classList.contains('active')) {
                    toggleMenu();
                }
            }, 200);
        });
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const sideMenu = document.getElementById('sideMenu');
            if (sideMenu && sideMenu.classList.contains('active')) {
                toggleMenu();
            }
        }
    });
});