/* ============================================================
   Assemble — shared site chrome
   ------------------------------------------------------------
   Renders the navbar (+ mobile menu) and the footer on EVERY page
   from this single file, so adding a page means editing one file
   instead of every HTML file.

   Usage — in each page, just before </body>:

       <script src="scripts/site.js" defer></script>

   The script injects, in this order:
     1. <nav class="navbar">        as the first child of <body>
     2. <div class="mobile-menu">   right after the navbar
     3. <footer class="footer">     as the last child of <body>

   It also wires up:
     - navbar drop shadow on scroll
     - hamburger open / close (X, backdrop, link click, Esc)
     - `.active` class on the link matching the current page

   IMPORTANT: do NOT minify or auto-compact this file.
   ============================================================ */

(function () {
    'use strict';

    /* ---- Edit these lists when pages are added ---------------- */

    var NAV_LINKS = [
        // { label: 'Features', href: 'index.html#features' },
        { label: 'FAQ', href: 'index.html#faq' },
        // { label: 'Resources', href: 'resources.html' },
        { label: 'Pricing', href: 'pricing.html' }
    ];

    var DOWNLOAD_HREF = 'download.html';

    var FOOTER_LINKS = [
        { label: 'Pricing', href: 'pricing.html' },
        { label: 'Privacy Policy', href: 'privacy-policy.html' },
        { label: 'Terms of Service', href: 'terms.html' },
        { label: 'Refund Policy', href: 'refund.html' }
    ];

    var SITE_NAME = 'Assemble';

    /* ---- Helpers ---------------------------------------------- */

    function currentPage() {
        var file = window.location.pathname.split('/').pop();
        return file === '' ? 'index.html' : file;
    }

    function isActive(href) {
        return href.split('#')[0] === currentPage();
    }

    function desktopLink(link) {
        return '        <a href="' + link.href + '"'
            + (isActive(link.href) ? ' class="active"' : '')
            + '>' + link.label + '</a>';
    }

    function mobileLink(link) {
        return '            <a href="' + link.href + '"'
            + (isActive(link.href) ? ' class="active"' : '')
            + '>' + link.label + '</a>';
    }

    function footerLink(link) {
        return '        <a href="' + link.href + '"'
            + (isActive(link.href) ? ' class="active"' : '')
            + '>' + link.label + '</a>';
    }

    /* ---- Markup ------------------------------------------------ */

    function navbarHtml() {
        var lines = [
            '<nav class="navbar" id="navbar">',
            '    <a href="index.html" class="navbar-brand">',
            '        <img src="app-logo.png" alt="' + SITE_NAME + ' logo" class="navbar-logo">',
            '        <span class="navbar-title">' + SITE_NAME + '</span>',
            '    </a>',
            '    <div class="navbar-links">'
        ]
            .concat(NAV_LINKS.map(desktopLink))
            .concat([
                '    </div>',
                '    <a href="' + DOWNLOAD_HREF + '" class="navbar-download">Download</a>',
                '    <button class="hamburger" id="hamburger" type="button" aria-label="Open menu" aria-expanded="false">',
                '        <span></span><span></span><span></span>',
                '    </button>',
                '</nav>'
            ]);

        return lines.join('\n');
    }

    function mobileMenuHtml() {
        var lines = [
            '<div class="mobile-menu" id="mobileMenu">',
            '    <div class="mobile-menu-backdrop"></div>',
            '    <div class="mobile-menu-panel">',
            '        <button class="mobile-menu-close" id="mobileMenuClose" type="button" aria-label="Close menu">&times;</button>',
            '        <nav class="mobile-menu-links">'
        ]
            .concat(NAV_LINKS.map(mobileLink))
            .concat([
                '            <a href="' + DOWNLOAD_HREF + '" class="mobile-download">Download</a>',
                '        </nav>',
                '    </div>',
                '</div>'
            ]);

        return lines.join('\n');
    }

    function footerHtml() {
        var lines = [
            '<footer class="footer">',
            '    <div class="footer-brand">',
            '        <img src="app-logo.png" alt="' + SITE_NAME + '">',
            '        <span>' + SITE_NAME + '</span>',
            '    </div>',
            '    <div class="footer-links">'
        ]
            .concat(FOOTER_LINKS.map(footerLink))
            .concat([
                '    </div>',
                '    <p class="footer-copy">&copy; 2026 ' + SITE_NAME + '</p>',
                '</footer>'
            ]);

        return lines.join('\n');
    }

    /* ---- Behaviour --------------------------------------------- */

    function wireNavbar() {
        var navbar = document.getElementById('navbar');
        var hamburger = document.getElementById('hamburger');
        var menu = document.getElementById('mobileMenu');
        var closeBtn = document.getElementById('mobileMenuClose');
        var backdrop = menu ? menu.querySelector('.mobile-menu-backdrop') : null;

        /* Drop shadow once the page is scrolled */
        if (navbar) {
            window.addEventListener('scroll', function () {
                if (window.scrollY > 10) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });
        }

        if (!hamburger || !menu || !closeBtn) return;

        function openMenu() {
            menu.classList.add('open');
            document.body.classList.add('menu-open');
            hamburger.setAttribute('aria-expanded', 'true');
        }

        function closeMenu() {
            menu.classList.remove('open');
            document.body.classList.remove('menu-open');
            hamburger.setAttribute('aria-expanded', 'false');
        }

        hamburger.addEventListener('click', openMenu);
        closeBtn.addEventListener('click', closeMenu);

        /* Any link inside the menu closes it */
        menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });

        /* Clicking the dimmed backdrop closes it */
        if (backdrop) {
            backdrop.addEventListener('click', closeMenu);
        }

        /* Esc closes it */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMenu();
        });
    }

    /* ---- Injection --------------------------------------------- */

    function inject() {
        document.body.insertAdjacentHTML(
            'afterbegin',
            navbarHtml() + '\n' + mobileMenuHtml()
        );

        document.body.insertAdjacentHTML(
            'beforeend',
            '\n' + footerHtml()
        );

        wireNavbar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
