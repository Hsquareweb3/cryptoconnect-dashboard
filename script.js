// Wallet state
const walletState = {
    ethereum: {
        connected: false,
        address: null,
        balance: '0.00',
        chainId: null,
        transactions: [],
    },
    solana: {
        connected: false,
        address: null,
        balance: '0.00',
        network: 'devnet',
        transactions: [],
    },
};

// Mock transaction data (for demo)
const mockTransactions = {
    ethereum: [
        { hash: '0x8a7e...8f2c', to: '0x742d...a1b5', amount: '0.05', status: 'success', timestamp: Date.now() - 3600000 },
        { hash: '0xb4c2...2e9d', to: '0x1a3c...f7e2', amount: '0.10', status: 'success', timestamp: Date.now() - 7200000 },
    ],
    solana: [
        { hash: '3fE8q...7Kp', to: '9w107...2YGu', amount: '0.5', status: 'success', timestamp: Date.now() - 5400000 },
        { hash: '4aB9j...5Mx', to: '7x3Qr...8nFg', amount: '1.2', status: 'success', timestamp: Date.now() - 10800000 },
    ],
};

// ============ ALERT SYSTEM ============
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert ${type} fade-in`;
    alert.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// ============ ETHEREUM / METAMASK ============
async function connectMetaMask() {
    if (!window.ethereum) {
        showAlert('MetaMask not installed. Please install it to continue.', 'error');
        return;
    }

    try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        // Get chain ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        // Check if on Sepolia testnet (0xaa36a7)
        if (chainId !== '0xaa36a7') {
            showAlert('Please switch to Sepolia Testnet in MetaMask', 'info');
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }],
                });
            } catch (error) {
                if (error.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0xaa36a7',
                            chainName: 'Sepolia',
                            rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
                            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                            blockExplorerUrls: ['https://sepolia.etherscan.io'],
                        }],
                    });
                }
            }
        }

        // Update state
        walletState.ethereum.connected = true;
        walletState.ethereum.address = address;
        walletState.ethereum.chainId = chainId;

        // Fetch balance
        await fetchETHBalance(address);

        // Load mock transactions
        walletState.ethereum.transactions = mockTransactions.ethereum;

        // Update UI
        updateUI();
        showAlert(`Connected to MetaMask: ${address.substring(0, 6)}...${address.substring(38)}`, 'success');

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                disconnectMetaMask();
            } else {
                walletState.ethereum.address = accounts[0];
                fetchETHBalance(accounts[0]);
                updateUI();
            }
        });

        // Listen for chain changes
        window.ethereum.on('chainChanged', () => {
            location.reload();
        });
    } catch (error) {
        console.error('MetaMask error:', error);
        showAlert('Failed to connect MetaMask: ' + error.message, 'error');
    }
}

async function fetchETHBalance(address) {
    try {
        // Mock balance for demo (in real app, use ethers.js or web3.js)
        const mockBalance = (Math.random() * 5).toFixed(4);
        walletState.ethereum.balance = mockBalance;
    } catch (error) {
        console.error('Error fetching ETH balance:', error);
        showAlert('Error fetching balance', 'error');
    }
}

function disconnectMetaMask() {
    walletState.ethereum = {
        connected: false,
        address: null,
        balance: '0.00',
        chainId: null,
        transactions: [],
    };
    updateUI();
    showAlert('Disconnected from MetaMask', 'info');
}

// ============ SOLANA / PHANTOM ============
async function connectSolana() {
    if (!window.solana) {
        showAlert('Phantom wallet not installed. Please install it to continue.', 'error');
        return;
    }

    try {
        const response = await window.solana.connect();
        const address = response.publicKey.toString();

        walletState.solana.connected = true;
        walletState.solana.address = address;
        walletState.solana.network = 'devnet';

        // Fetch balance
        await fetchSOLBalance(address);

        // Load mock transactions
        walletState.solana.transactions = mockTransactions.solana;

        // Update UI
        updateUI();
        showAlert(`Connected to Phantom: ${address.substring(0, 6)}...${address.substring(38)}`, 'success');
    } catch (error) {
        console.error('Solana error:', error);
        showAlert('Failed to connect Phantom: ' + error.message, 'error');
    }
}

async function fetchSOLBalance(address) {
    try {
        // Mock balance for demo
        const mockBalance = (Math.random() * 10).toFixed(2);
        walletState.solana.balance = mockBalance;
    } catch (error) {
        console.error('Error fetching SOL balance:', error);
        showAlert('Error fetching balance', 'error');
    }
}

function disconnectSolana() {
    if (window.solana) {
        window.solana.disconnect();
    }
    walletState.solana = {
        connected: false,
        address: null,
        balance: '0.00',
        network: 'devnet',
        transactions: [],
    };
    updateUI();
    showAlert('Disconnected from Phantom', 'info');
}

// ============ SEND TRANSACTION ============
async function sendTransaction() {
    const network = document.getElementById('sendNetwork').value;
    const recipient = document.getElementById('recipientAddress').value;
    const amount = document.getElementById('sendAmount').value;

    if (!network) {
        showAlert('Please select a network', 'error');
        return;
    }
    if (!recipient) {
        showAlert('Please enter a recipient address', 'error');
        return;
    }
    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount', 'error');
        return;
    }

    const sendBtn = document.querySelector('button[onclick="sendTransaction()"]');
    const sendBtnText = document.getElementById('sendBtnText');
    const originalText = sendBtnText.innerHTML;
    
    sendBtn.disabled = true;
    sendBtnText.innerHTML = '<span class="spinner"></span> Sending...';

    try {
        if (network === 'ethereum') {
            await sendETHTransaction(recipient, amount);
        } else if (network === 'solana') {
            await sendSOLTransaction(recipient, amount);
        }

        // Add to transaction history
        const txHash = `0x${Math.random().toString(16).substr(2, 10)}`;
        const newTx = {
            hash: txHash,
            to: recipient,
            amount: amount,
            status: 'success',
            timestamp: Date.now(),
        };

        if (network === 'ethereum') {
            walletState.ethereum.transactions.unshift(newTx);
        } else {
            walletState.solana.transactions.unshift(newTx);
        }

        // Clear form
        document.getElementById('recipientAddress').value = '';
        document.getElementById('sendAmount').value = '';

        // Update UI
        updateUI();
        showAlert(`Transaction sent successfully! Hash: ${txHash.substring(0, 10)}...`, 'success');
    } catch (error) {
        console.error('Send error:', error);
        showAlert('Transaction failed: ' + error.message, 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtnText.innerHTML = originalText;
    }
}

async function sendETHTransaction(recipient, amount) {
    if (!window.ethereum) {
        throw new Error('MetaMask not available');
    }

    // Validate Ethereum address
    if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid Ethereum address');
    }

    // Mock transaction (in real app, use ethers.js)
    return new Promise((resolve) => {
        setTimeout(() => resolve(), 1500);
    });
}

async function sendSOLTransaction(recipient, amount) {
    if (!window.solana) {
        throw new Error('Phantom not available');
    }

    // Mock transaction (in real app, use @solana/web3.js)
    return new Promise((resolve) => {
        setTimeout(() => resolve(), 1500);
    });
}

// ============ UI UPDATES ============
function updateUI() {
    const connectSection = document.getElementById('connectSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const ethCard = document.getElementById('ethCard');
    const solCard = document.getElementById('solCard');
    const headerStatus = document.getElementById('headerStatus');

    // Show/hide sections
    if (walletState.ethereum.connected || walletState.solana.connected) {
        connectSection.style.display = 'none';
        dashboardSection.style.display = 'block';
    } else {
        connectSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        headerStatus.textContent = 'Not connected';
        return;
    }

    // Update Ethereum card
    if (walletState.ethereum.connected) {
        ethCard.style.display = 'block';
        document.getElementById('ethBalance').textContent = walletState.ethereum.balance;
        document.getElementById('ethAddress').textContent = 
            walletState.ethereum.address.substring(0, 6) + '...' + 
            walletState.ethereum.address.substring(38);
        document.getElementById('ethnetworkOption').style.display = 'block';
        headerStatus.textContent = `Connected: ${walletState.ethereum.address.substring(0, 6)}...`;
    } else {
        ethCard.style.display = 'none';
        document.getElementById('ethnetworkOption').style.display = 'none';
    }

    // Update Solana card
    if (walletState.solana.connected) {
        solCard.style.display = 'block';
        document.getElementById('solBalance').textContent = walletState.solana.balance;
        document.getElementById('solAddress').textContent = 
            walletState.solana.address.substring(0, 6) + '...' + 
            walletState.solana.address.substring(38);
        document.getElementById('solnetworkOption').style.display = 'block';
        headerStatus.textContent = `Connected: ${walletState.solana.address.substring(0, 6)}...`;
    } else {
        solCard.style.display = 'none';
        document.getElementById('solnetworkOption').style.display = 'none';
    }

    // Update transactions display
    updateTransactionsDisplay();
}

function updateTransactionsDisplay() {
    const container = document.getElementById('transactionsContainer');
    
    // Get all transactions sorted by timestamp
    const allTransactions = [
        ...walletState.ethereum.transactions.map(tx => ({ ...tx, network: 'ethereum' })),
        ...walletState.solana.transactions.map(tx => ({ ...tx, network: 'solana' })),
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

    if (allTransactions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-inbox text-4xl text-gray-200 mb-4 block"></i>
                <p class="text-gray-500">No transactions yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = allTransactions.map(tx => {
        const time = formatTime(tx.timestamp);
        const networkLabel = tx.network === 'ethereum' ? 'ETH' : 'SOL';
        const icon = tx.network === 'ethereum' ? 'fab fa-ethereum' : 'fas fa-circle';
        
        return `
            <div class="transaction-row">
                <div class="flex items-center gap-4 flex-1">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${tx.network === 'ethereum' ? 'bg-blue-100' : 'bg-purple-100'}">
                        <i class="${icon} ${tx.network === 'ethereum' ? 'text-blue-600' : 'text-purple-600'}"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-semibold text-gray-900">Send ${networkLabel}</p>
                        <p class="text-sm text-gray-500 font-mono">${tx.to.substring(0, 8)}...${tx.to.substring(tx.to.length - 6)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-gray-900">${tx.amount} ${networkLabel}</p>
                    <p class="text-xs text-gray-500">${time}</p>
                </div>
                <div class="ml-4">
                    <span class="badge success">
                        <i class="fas fa-check-circle mr-1"></i>
                        Success
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function formatTime(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// ============ INITIALIZE ============
window.addEventListener('load', () => {
    // Check if wallets are already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
        connectMetaMask();
    }
    if (window.solana && window.solana.isConnected) {
        connectSolana();
    }
});