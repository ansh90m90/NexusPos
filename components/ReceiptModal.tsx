import React from 'react';
import type { Transaction, Product, AppSettings } from '../types';

interface ReceiptModalProps {
  transaction: Transaction | null;
  products: Product[];
  onClose: () => void;
  appSettings: AppSettings;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, products, onClose, appSettings }) => {
  if (!transaction) return null;

  const handlePrint = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    const receiptHtml = document.getElementById('printable-receipt-content')?.innerHTML;

    if (frameDoc && receiptHtml) {
        frameDoc.open();
        frameDoc.write('<html><head><title>Print Receipt</title>');
        frameDoc.write('<style>body { font-family: monospace; font-size: 10pt; color: black; } table { width: 100%; border-collapse: collapse; } td, th { text-align: left; padding: 2px; } .text-right { text-align: right !important; } .font-bold { font-weight: bold; } .text-center { text-align: center; } .border-b { border-bottom: 1px dashed black; } .border-t { border-top: 1px dashed black; } .mb-4 { margin-bottom: 1rem; } .mb-1 { margin-bottom: 0.25rem; } .mt-1 { margin-top: 0.25rem; } .mt-2 { margin-top: 0.5rem; } .mt-4 { margin-top: 1rem; } .pb-1 { padding-bottom: 0.25rem; } .pt-2 { padding-top: 0.5rem; } .text-base { font-size: 1rem; } .text-sm { font-size: 0.875rem; } .justify-between { justify-content: space-between; } .flex { display: flex; } </style>');
        frameDoc.write('</head><body>');
        frameDoc.write(receiptHtml);
        frameDoc.write('</body></html>');
        frameDoc.close();
        
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        
        setTimeout(() => {
            document.body.removeChild(printFrame);
        }, 500);
    }
  };

  const paymentSummary = transaction.payments.map(p => `${p.method}: ₹${p.amount.toFixed(2)}`).join(', ');

  const receiptContent = (
     <div className="bg-white text-black p-4 font-mono text-xs w-72 mx-auto">
        <div className="text-center mb-4">
            <h2 className="font-bold text-base">{appSettings.shopName}</h2>
            <p>123 Business Rd, Surat, Gujarat</p>
            <p>GSTIN: 24ABCDE1234F1Z5</p>
        </div>
        <div className="border-b border-dashed border-black pb-1 mb-1">
            <p>Date: {new Date(transaction.date).toLocaleString()}</p>
            <p>Receipt No: {transaction.id.slice(-6)}</p>
            {transaction.customer && <p>Customer: {transaction.customer.name}</p>}
        </div>
        <table className="w-full">
            <thead>
                <tr className="border-b border-dashed border-black">
                    <th className="text-left">Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                {transaction.items.map((cartItem, index) => {
                     let name = 'Unknown Item';
                     const item = cartItem.item;
                     if ('ingredients' in item) { // This is a Dish
                         name = item.name;
                     } else { // This is a ProductVariant
                         const product = products.find(p => p.id === item.productId);
                         name = product ? `${product.name} - ${item.name}` : item.name;
                     }
                     return(
                        <tr key={index}>
                            <td className="text-left">{name}</td>
                            <td className="text-right">{cartItem.quantity}</td>
                            <td className="text-right">{cartItem.appliedPrice.toFixed(2)}</td>
                            <td className="text-right">{(cartItem.quantity * cartItem.appliedPrice).toFixed(2)}</td>
                        </tr>
                     )
                })}
            </tbody>
        </table>
        <div className="border-t border-dashed border-black mt-2 pt-2">
            <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{transaction.subtotal.toFixed(2)}</span>
            </div>
            {transaction.discount && (
                <div className="flex justify-between">
                    <span>Discount ({transaction.discount.promotionName})</span>
                    <span>-₹{transaction.discount.amount.toFixed(2)}</span>
                </div>
            )}
            {transaction.extraCharges && transaction.extraCharges.map((charge, index) => (
                 <div key={index} className="flex justify-between">
                    <span>{charge.description}</span>
                    <span>+₹{charge.amount.toFixed(2)}</span>
                </div>
            ))}
            <div className="flex justify-between font-bold text-sm mt-1 border-t border-dashed border-black pt-1">
                <span>GRAND TOTAL</span>
                <span>₹{transaction.total.toFixed(2)}</span>
            </div>
             <p className="mt-1">Paid via: {paymentSummary}</p>
        </div>
        <div className="text-center mt-4">
            <p>{appSettings.receiptFooter}</p>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-sm w-full">
        <div className="p-4 border-b dark:border-neutral-700">
            <h3 className="text-lg font-bold">Transaction Complete</h3>
        </div>
        <div id="printable-receipt-content" className="absolute -left-[9999px] top-0">
            {receiptContent}
        </div>
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900">
            {receiptContent}
        </div>
        <div className="p-4 flex justify-between gap-4">
          <button onClick={onClose} className="w-full px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 transition">Close</button>
          <button onClick={handlePrint} className="w-full px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition">Print Receipt</button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;