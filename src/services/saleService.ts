import { ref, push, onValue, off, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Sale } from '@/types/pos';

const SALES_REF = 'sales';

export const createSale = async (sale: Omit<Sale, 'id'>): Promise<void> => {
  try {
    const newSaleRef = push(ref(db, SALES_REF));
    await push(ref(db, SALES_REF), {
      ...sale,
      id: newSaleRef.key
    });
    console.log('Sale recorded successfully');
  } catch (error) {
    console.error('Error recording sale:', error);
    throw error;
  }
};

export const deleteSale = async (saleId: string): Promise<void> => {
  try {
    console.log('Attempting to delete sale with ID:', saleId);
    // Find the sale reference by iterating through sales to get the correct key
    const salesRef = ref(db, SALES_REF);
    
    return new Promise((resolve, reject) => {
      onValue(salesRef, async (snapshot) => {
        let saleKey: string | null = null;
        
        snapshot.forEach((childSnapshot) => {
          const sale = childSnapshot.val();
          if (sale.id === saleId) {
            saleKey = childSnapshot.key;
            return true; // Break the forEach loop
          }
        });
        
        if (saleKey) {
          console.log('Found sale key:', saleKey);
          const saleRef = ref(db, `${SALES_REF}/${saleKey}`);
          await remove(saleRef);
          console.log('Sale deleted successfully');
          resolve();
        } else {
          console.error('Sale not found');
          reject(new Error('Sale not found'));
        }
      }, {
        onlyOnce: true // Only run once, don't subscribe
      });
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    throw error;
  }
};

export const subscribeToSales = (callback: (sales: Sale[]) => void): () => void => {
  const salesRef = ref(db, SALES_REF);
  
  onValue(salesRef, (snapshot) => {
    const sales: Sale[] = [];
    snapshot.forEach((childSnapshot) => {
      const sale = childSnapshot.val();
      sales.push(sale);
    });
    callback(sales);
  });

  return () => off(salesRef);
};