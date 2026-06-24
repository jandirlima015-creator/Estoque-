import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocFromServer,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "firebase/firestore";

// Configuração do Firebase obtida do arquivo de provisionamento
const firebaseConfig = {
  projectId: "gen-lang-client-0509492998",
  appId: "1:1088177349174:web:a90f3278c50c743651ae97",
  apiKey: "AIzaSyDdDj1FBmAzRXMtJey4YJwhjz7xEJFLXbA",
  authDomain: "gen-lang-client-0509492998.firebaseapp.com",
  databaseId: "ai-studio-ba9953a6-89d8-4237-a1dd-7db447d9af3c",
  storageBucket: "gen-lang-client-0509492998.firebasestorage.app",
  messagingSenderId: "1088177349174"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.databaseId);

// Testar conexão de forma assíncrona para garantir conformidade com a Skill
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, "test", "connection");
    await getDocFromServer(testDoc);
    console.log("Conectado ao Firestore com sucesso!");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Cliente Firestore está offline. Usando cache local.");
    } else {
      console.error("Erro ao conectar ao Firestore:", error);
    }
    return false;
  }
}

// Interfaces TypeScript para Tipagem Segura
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
  price: number;
  updatedAt: string;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  type: "count" | "in" | "out" | "adjustment";
  quantity: number;
  previousStock: number;
  newStock: number;
  difference: number;
  notes: string;
  timestamp: string;
  operator: string;
}

// Funções de CRUD para Produtos
export async function getProductsFromDB(): Promise<Product[]> {
  try {
    const colRef = collection(db, "products");
    const snapshot = await getDocs(colRef);
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    return products;
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    return [];
  }
}

export async function saveProductToDB(product: Product): Promise<void> {
  try {
    const docRef = doc(db, "products", product.id);
    await setDoc(docRef, product);
  } catch (error) {
    console.error("Erro ao salvar produto:", error);
  }
}

export async function deleteProductFromDB(productId: string): Promise<void> {
  try {
    const docRef = doc(db, "products", productId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
  }
}

// Funções de CRUD para Histórico / Logs
export async function getStockLogsFromDB(): Promise<StockLog[]> {
  try {
    const colRef = collection(db, "stockLogs");
    const q = query(colRef, orderBy("timestamp", "desc"), limit(100));
    const snapshot = await getDocs(q);
    const logs: StockLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as StockLog);
    });
    return logs;
  } catch (error) {
    console.error("Erro ao carregar logs:", error);
    return [];
  }
}

export async function addStockLogToDB(log: StockLog): Promise<void> {
  try {
    const docRef = doc(db, "stockLogs", log.id);
    await setDoc(docRef, log);
  } catch (error) {
    console.error("Erro ao salvar log de movimentação:", error);
  }
}

// Inicializar banco com dados de exemplo se estiver vazio
export async function initializeDefaultProducts(): Promise<Product[]> {
  try {
    const existing = await getProductsFromDB();
    if (existing.length > 0) {
      return existing;
    }

    console.log("Banco de dados vazio. Semeando produtos de exemplo...");
    const defaultProducts: Product[] = [
      {
        id: "prod-1",
        name: "Arroz Integral Camil 1kg",
        sku: "ARR-CAM-001",
        barcode: "7891234567890",
        category: "Alimentos",
        currentStock: 45,
        minStock: 15,
        unit: "un",
        price: 8.50,
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-2",
        name: "Feijão Preto Tipo 1 Kicaldo 1kg",
        sku: "FEI-KIC-002",
        barcode: "7891234567891",
        category: "Alimentos",
        currentStock: 30,
        minStock: 15,
        unit: "un",
        price: 9.90,
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-3",
        name: "Azeite de Oliva Extravirgem Gallo 500ml",
        sku: "AZE-GAL-003",
        barcode: "7891234567892",
        category: "Mercearia",
        currentStock: 8,
        minStock: 12,
        unit: "un",
        price: 34.90,
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-4",
        name: "Detergente Neutro Ypê 500ml",
        sku: "DET-YPE-004",
        barcode: "7891234567893",
        category: "Limpeza",
        currentStock: 50,
        minStock: 20,
        unit: "un",
        price: 2.20,
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-5",
        name: "Leite Desnatado Piracanjuba 1L",
        sku: "LEI-PIR-005",
        barcode: "7891234567894",
        category: "Laticínios",
        currentStock: 12,
        minStock: 25,
        unit: "un",
        price: 5.40,
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-6",
        name: "Sabonete Líquido Protex Macadâmia 250ml",
        sku: "SAB-PRO-006",
        barcode: "7891234567895",
        category: "Higiene",
        currentStock: 28,
        minStock: 10,
        unit: "un",
        price: 12.00,
        updatedAt: new Date().toISOString()
      }
    ];

    for (const prod of defaultProducts) {
      await saveProductToDB(prod);
      
      // Criar log inicial
      const log: StockLog = {
        id: `log-init-${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        type: "adjustment",
        quantity: prod.currentStock,
        previousStock: 0,
        newStock: prod.currentStock,
        difference: prod.currentStock,
        notes: "Saldo inicial semeado automaticamente.",
        timestamp: new Date().toISOString(),
        operator: "Sistema"
      };
      await addStockLogToDB(log);
    }

    return defaultProducts;
  } catch (error) {
    console.error("Erro ao semear banco de dados:", error);
    return [];
  }
}

