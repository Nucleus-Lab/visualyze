import { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';

const Toast = ({ message, txHash, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose();
      }, 300); // Allow time for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getTransactionUrl = (hash) => {
    return `https://testnet.bscscan.com/tx/${hash}`;
  };

  return (
    <div 
      className={`fixed bottom-5 right-5 bg-[#2D2D3B] text-white px-4 py-3 rounded-lg shadow-lg max-w-md z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-green-400">
          <FaCheckCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium mb-1">{message}</p>
          {txHash && (
            <a 
              href={getTransactionUrl(txHash)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#D4A017] flex items-center text-sm hover:underline"
            >
              View transaction <FaExternalLinkAlt className="ml-1 w-3 h-3" />
            </a>
          )}
        </div>
        <button 
          onClick={handleClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast; 