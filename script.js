document.addEventListener('DOMContentLoaded', () => {
    // Sparkle Effect
    const hero = document.querySelector('.hero');
    if (hero) {
        for (let i = 0; i < 30; i++) {
            let sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.style.left = `${Math.random() * 100}%`;
            sparkle.style.top = `${Math.random() * 100}%`;
            sparkle.style.animationDuration = `${Math.random() * 2 + 3}s`;
            sparkle.style.animationDelay = `${Math.random() * 3}s`;
            hero.appendChild(sparkle);
        }
    }

    // Scroll Animation
    const scrollElements = document.querySelectorAll('.scroll-animate');
    const roadmapTimeline = document.querySelector('.roadmap-timeline');

    const elementInView = (el, dividend = 1) => {
        if (!el) return false;
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend
        );
    };

    const displayScrollElement = (element) => {
        element.classList.add('in-view');
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 1.25)) {
                displayScrollElement(el);
            }
        });

        if (elementInView(roadmapTimeline, 1.25)) {
            roadmapTimeline.classList.add('in-view');
        }
    };

    window.addEventListener('scroll', () => {
        handleScrollAnimation();
    });

    // Contract Address Copy
    const copyButton = document.getElementById('copy-btn');
    const contractAddress = document.getElementById('contract-address-text');

    if (copyButton && contractAddress) {
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(contractAddress.innerText).then(() => {
                copyButton.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    }
}); 