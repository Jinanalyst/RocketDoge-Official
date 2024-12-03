// Import wallet manager
import walletManager from './wallet.js';

// Initialize wallet connection
async function initializeApp() {
    try {
        // Add click listeners to all wallet buttons
        const walletButtons = document.querySelectorAll('[id^="walletBtn"], [id^="connectWalletBtn"]');
        walletButtons.forEach(button => {
            button.addEventListener('click', async () => {
                await walletManager.connectWallet();
            });
        });

        // Check for existing connection
        await walletManager.checkExistingConnection();

        // Initialize success/error message containers if they don't exist
        initializeMessageContainers();

    } catch (error) {
        console.error('Error initializing app:', error);
        walletManager.showError(error.message);
    }
}

// Create message containers if they don't exist
function initializeMessageContainers() {
    const containers = ['errorMessage', 'successMessage'];
    containers.forEach(id => {
        if (!document.getElementById(id)) {
            const div = document.createElement('div');
            div.id = id;
            div.className = `alert alert-${id.includes('error') ? 'danger' : 'success'}`;
            div.style.display = 'none';
            div.style.position = 'fixed';
            div.style.top = '20px';
            div.style.left = '50%';
            div.style.transform = 'translateX(-50%)';
            div.style.zIndex = '1000';
            document.body.appendChild(div);
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for use in other files
export { walletManager };
