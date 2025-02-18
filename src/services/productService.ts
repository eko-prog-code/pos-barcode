import { ref, push, remove, set, onValue, off, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Product } from '@/types/pos';

const PRODUCTS_REF = 'products';

export const createProduct = async (product: Omit<Product, 'id'>, imageFile?: File): Promise<void> => {
  try {
    let imageUrl = '/placeholder.svg';
    if (imageFile) {
      const imageRef = storageRef(storage, `product-images/${Date.now()}-${imageFile.name}`);
      const uploadResult = await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(uploadResult.ref);
    }
    const newProductRef = push(ref(db, PRODUCTS_REF));
    await set(newProductRef, {
      ...product,
      id: newProductRef.key,
      image: imageUrl
    });
    console.log('Product created successfully');
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (product: Product): Promise<void> => {
  try {
    const updates = {
      name: product.name,
      regularPrice: product.regularPrice,
      stock: product.stock,
    };
    
    await update(ref(db, `${PRODUCTS_REF}/${product.id}`), updates);
    console.log('Product updated successfully');
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const updateProductStock = async (productId: string, newStock: number): Promise<void> => {
  try {
    const productRef = ref(db, `${PRODUCTS_REF}/${productId}`);
    await update(productRef, { stock: newStock });
    console.log('Product stock updated successfully');
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    await remove(ref(db, `${PRODUCTS_REF}/${productId}`));
    console.log('Product deleted successfully');
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

export const subscribeToProducts = (callback: (products: Product[]) => void): () => void => {
  const productsRef = ref(db, PRODUCTS_REF);
  
  onValue(productsRef, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((childSnapshot) => {
      const product = childSnapshot.val();
      products.push(product);
    });
    callback(products);
  });
  return () => off(productsRef);
};
