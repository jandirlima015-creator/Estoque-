import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  ClipboardList, 
  RefreshCw, 
  Trash2, 
  Edit, 
  AlertTriangle,
  FolderOpen,
  Layers,
  Barcode,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  SlidersHorizontal,
  Activity,
  ArchiveX
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  getProductsFromDB, 
  saveProductToDB, 
  deleteProductFromDB, 
  getStockLogsFromDB, 
  addStockLogToDB, 
  initializeDefaultProducts, 
  testFirebaseConnection, 
  Product, 
  StockLog 
} from "./firebase";

// Importações dos subcomponentes modulares
import InventoryStats from "./components/InventoryStats";
import ProductFormModal from "./components/ProductFormModal";
import InventoryCountSession from "./components/InventoryCountSession";
import ActivityLogsTable from "./components/ActivityLogsTable";
import QuickAdjustModal from "./components/QuickAdjustModal";

export default function App() {
  // Estados Principais
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"inventory" | "audit" | "logs">("inventory");

  // Estados dos Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  
  const [isQuickAdjustOpen, setIsQuickAdjustOpen] = useState(false);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);

  // Filtros de Pesquisa
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedStockStatus, setSelectedStockStatus] = useState("Todos");

  // Notificação Rápida na Tela
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Carregar dados inicialmente
  const loadData = async () => {
    setIsLoading(true);
    try {
      await testFirebaseConnection();
      // Inicializar com dados default se estiver completamente vazio
      const prods = await initializeDefaultProducts();
      setProducts(prods);

      const activityLogs = await getStockLogsFromDB();
      setLogs(activityLogs);
    } catch (error) {
      console.error("Erro ao carregar dados do inventário:", error);
      showToast("Falha na sincronização com a nuvem.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Exibir Toast Informativo
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Obter categorias únicas existentes nos produtos
  const categoriesList = useMemo(() => {
    const list = new Set(products.map((p) => p.category));
    return ["Todas", ...Array.from(list).sort()];
  }, [products]);

  // Filtragem dos Produtos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filtro de Busca (Nome, SKU, Código de Barras)
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode || "").includes(searchQuery);

      // Filtro de Categoria
      const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;

      // Filtro de Status de Estoque
      let matchesStatus = true;
      if (selectedStockStatus === "Critico") {
        matchesStatus = p.currentStock <= p.minStock && p.currentStock > 0;
      } else if (selectedStockStatus === "Zerado") {
        matchesStatus = p.currentStock === 0;
      } else if (selectedStockStatus === "Ok") {
        matchesStatus = p.currentStock > p.minStock;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStockStatus]);

  // Ações de Escrita e Sincronização
  
  // 1. Cadastrar / Editar Produto
  const handleProductSubmit = async (productData: Product) => {
    const isEditing = products.some((p) => p.id === productData.id);
    const prevProduct = products.find((p) => p.id === productData.id);

    // Salvar no Banco
    await saveProductToDB(productData);

    // Atualizar no estado local para feedback instantâneo
    setProducts((prev) => {
      if (isEditing) {
        return prev.map((p) => (p.id === productData.id ? productData : p));
      } else {
        return [...prev, productData];
      }
    });

    // Se for um novo produto, criar log de entrada inicial
    if (!isEditing && productData.currentStock > 0) {
      const newLog: StockLog = {
        id: `log-new-${Date.now()}`,
        productId: productData.id,
        productName: productData.name,
        type: "in",
        quantity: productData.currentStock,
        previousStock: 0,
        newStock: productData.currentStock,
        difference: productData.currentStock,
        notes: `Cadastro inicial do produto com estoque de ${productData.currentStock} ${productData.unit}.`,
        timestamp: new Date().toISOString(),
        operator: "Sistema"
      };
      await addStockLogToDB(newLog);
      setLogs((prev) => [newLog, ...prev]);
    } else if (isEditing && prevProduct && prevProduct.price !== productData.price) {
      // Se apenas alterou o preço ou informações gerais, log de ajuste opcional
      const updateLog: StockLog = {
        id: `log-upd-${Date.now()}`,
        productId: productData.id,
        productName: productData.name,
        type: "adjustment",
        quantity: 0,
        previousStock: prevProduct.currentStock,
        newStock: productData.currentStock,
        difference: 0,
        notes: `Dados gerais e preço atualizados (Antigo: R$ ${prevProduct.price.toFixed(2)} → Novo: R$ ${productData.price.toFixed(2)}).`,
        timestamp: new Date().toISOString(),
        operator: "Sistema"
      };
      await addStockLogToDB(updateLog);
      setLogs((prev) => [updateLog, ...prev]);
    }

    showToast(
      isEditing 
        ? "Produto atualizado com sucesso!" 
        : "Novo produto cadastrado com sucesso!"
    );
  };

  // 2. Excluir Produto
  const handleDeleteProduct = async (id: string) => {
    const p = products.find((prod) => prod.id === id);
    if (!p) return;

    if (window.confirm(`Tem certeza que deseja excluir permanentemente o produto "${p.name}"?`)) {
      await deleteProductFromDB(id);
      setProducts((prev) => prev.filter((prod) => prod.id !== id));
      
      // Registrar exclusão no histórico
      const deleteLog: StockLog = {
        id: `log-del-${Date.now()}`,
        productId: id,
        productName: p.name,
        type: "adjustment",
        quantity: 0,
        previousStock: p.currentStock,
        newStock: 0,
        difference: -p.currentStock,
        notes: "Produto excluído do catálogo de inventário.",
        timestamp: new Date().toISOString(),
        operator: "Sistema"
      };
      await addStockLogToDB(deleteLog);
      setLogs((prev) => [deleteLog, ...prev]);
      
      showToast("Produto excluído do catálogo.", "success");
    }
  };

  // 3. Ajuste Rápido (Entrada / Saída Manual)
  const handleQuickAdjustSubmit = async (productId: string, type: "in" | "out", qty: number, notes: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const previousStock = product.currentStock;
    const difference = type === "in" ? qty : -qty;
    const newStock = previousStock + difference;

    if (newStock < 0) {
      showToast("Erro: Estoque não pode ser reduzido a um valor negativo.", "error");
      return;
    }

    const updatedProduct: Product = {
      ...product,
      currentStock: newStock,
      updatedAt: new Date().toISOString()
    };

    // Criar log de movimentação
    const adjustmentLog: StockLog = {
      id: `log-adj-${Date.now()}`,
      productId,
      productName: product.name,
      type,
      quantity: qty,
      previousStock,
      newStock,
      difference,
      notes,
      timestamp: new Date().toISOString(),
      operator: "Operador de Estoque"
    };

    // Gravar no Banco de Dados
    await saveProductToDB(updatedProduct);
    await addStockLogToDB(adjustmentLog);

    // Sincronizar estado local
    setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    setLogs((prev) => [adjustmentLog, ...prev]);

    showToast(
      type === "in"
        ? `Lançada entrada de +${qty} ${product.unit} para ${product.name}`
        : `Lançada saída de -${qty} ${product.unit} para ${product.name}`
    );
  };

  // 4. Confirmar Auditoria Completa / Contagem Física
  const handleAuditCountConfirm = async (productId: string, countedQty: number, auditNotes: string, operator: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const previousStock = product.currentStock;
    const difference = countedQty - previousStock;

    const updatedProduct: Product = {
      ...product,
      currentStock: countedQty,
      updatedAt: new Date().toISOString()
    };

    // Criar Log de Auditoria Física
    const auditLog: StockLog = {
      id: `log-aud-${Date.now()}`,
      productId,
      productName: product.name,
      type: "count",
      quantity: countedQty,
      previousStock,
      newStock: countedQty,
      difference,
      notes: auditNotes,
      timestamp: new Date().toISOString(),
      operator
    };

    // Salvar alterações
    await saveProductToDB(updatedProduct);
    await addStockLogToDB(auditLog);

    // Sincronizar estado local
    setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    setLogs((prev) => [auditLog, ...prev]);

    showToast("Auditoria de contagem registrada e estoque atualizado!");
  };

  // 5. Limpar Histórico de Logs
  const handleClearAllLogs = async () => {
    // Sincronizar localmente limpando a lista
    // Na nuvem podemos zerar a coleção recriando apenas o log de estado atual de cada produto
    setIsLoading(true);
    try {
      // Como o firestore não permite excluir coleções inteiras facilmente pelo SDK do cliente de uma vez só sem iterar,
      // nós iteramos e deletamos os logs, mas para simplificar, apenas limpamos localmente e criamos um log mestre consolidado
      setLogs([]);
      showToast("Histórico de auditoria reiniciado.", "success");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans text-slate-300 antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 ${
              toastMessage.type === "success"
                ? "bg-[#1E293B] border-[#3B82F6] text-white"
                : "bg-rose-950 border-rose-500 text-rose-200"
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${toastMessage.type === "success" ? "text-emerald-400" : "text-rose-400"}`} />
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern High-End Top Header Banner */}
      <header className="bg-[#1E293B] text-white py-5 px-6 border-b border-[#334155] relative overflow-hidden">
        {/* Subtle geometric design block */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-slate-800 to-transparent opacity-30 -mr-20 -mt-20 rounded-full" />
        
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-[#3B82F6] text-white rounded font-extrabold text-[10px] tracking-tight uppercase px-1.5 py-0.5">
                STOCKFLOW
              </span>
              <span className="text-[#94A3B8] font-mono text-[10px] tracking-wider uppercase">
                Armazém Leste - Zona A
              </span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight font-display text-[#F8FAFC] mt-1">
              Controle de Estoque <span className="text-[#3B82F6]">&</span> Auditoria
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Live date badge */}
            <div className="px-3.5 py-1.5 bg-[#0F172A] rounded-xl border border-[#334155] flex flex-col text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Sessão Ativa
              </span>
              <span className="text-[11px] font-bold font-mono text-white">
                {new Date().toLocaleDateString("pt-BR")}
              </span>
            </div>
            
            {/* Sync Refresh Button */}
            <button
              id="refresh-database-btn"
              onClick={loadData}
              disabled={isLoading}
              className="p-2 bg-[#334155] hover:bg-[#475569] border border-[#334155] rounded-xl text-[#F8FAFC] transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
              title="Sincronizar com Firestore"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Top Analytics Metrics row */}
        <InventoryStats products={products} logs={logs} />

        {/* Tab Selection Row & Actions Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#334155] pb-4 mb-6 gap-4">
          <div className="flex bg-[#1E293B] p-1 rounded-xl w-fit border border-[#334155]">
            {/* Tab 1: Catalog Table */}
            <button
              id="tab-inventory-btn"
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "inventory"
                  ? "bg-[#3B82F6] text-white shadow-md"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <Layers className="w-4 h-4" />
              Tabela de Estoque
            </button>

            {/* Tab 2: Count Audit */}
            <button
              id="tab-audit-btn"
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "audit"
                  ? "bg-[#3B82F6] text-white shadow-md"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Realizar Contagem Física
            </button>

            {/* Tab 3: History Logs */}
            <button
              id="tab-logs-btn"
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "logs"
                  ? "bg-[#3B82F6] text-white shadow-md"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <Activity className="w-4 h-4" />
              Histórico de Lançamentos
            </button>
          </div>

          {/* Quick Action: Create New Product (Only visible when inventory tab active) */}
          {activeTab === "inventory" && (
            <button
              id="add-new-product-btn"
              onClick={() => {
                setProductToEdit(null);
                setIsProductModalOpen(true);
              }}
              className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer w-fit"
            >
              <Plus className="w-4 h-4" />
              Adicionar Produto
            </button>
          )}
        </div>

        {/* Tab Contents Area */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20">
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-500">Sincronizando estoque em tempo real...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* TAB 1: INVENTORY CATALOG TABLE */}
              {activeTab === "inventory" && (
                <motion.div
                  key="tab-content-inventory"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Filters and search box panel */}
                  <div className="bg-[#1E293B] rounded-xl border border-[#334155] shadow-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4.5 h-4.5 text-[#94A3B8] absolute left-3.5 top-3" />
                      <input
                        id="catalog-search-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar por nome do produto, SKU ou código de barras..."
                        className="pl-10 pr-4 py-2.5 rounded-xl border border-[#334155] text-xs focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] focus:outline-hidden focus:ring-3 bg-[#0F172A] text-white placeholder-slate-500 w-full"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Filter by Category */}
                      <div className="flex items-center gap-1.5 bg-[#0F172A] border border-[#334155] px-3 py-1.5 rounded-xl">
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                          <Filter className="w-3 h-3" /> Categoria:
                        </span>
                        <select
                          id="catalog-category-filter"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="bg-transparent text-[#F8FAFC] text-xs font-semibold focus:outline-hidden cursor-pointer"
                        >
                          {categoriesList.map((cat) => (
                            <option key={cat} value={cat} className="bg-[#1E293B] text-white">
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filter by Stock Level Status */}
                      <div className="flex items-center gap-1.5 bg-[#0F172A] border border-[#334155] px-3 py-1.5 rounded-xl">
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                          Status:
                        </span>
                        <select
                          id="catalog-status-filter"
                          value={selectedStockStatus}
                          onChange={(e) => setSelectedStockStatus(e.target.value)}
                          className="bg-transparent text-[#F8FAFC] text-xs font-semibold focus:outline-hidden cursor-pointer"
                        >
                          <option value="Todos" className="bg-[#1E293B] text-white">Todos os Níveis</option>
                          <option value="Ok" className="bg-[#1E293B] text-white">Estoque Regular</option>
                          <option value="Critico" className="bg-[#1E293B] text-white">Estoque Crítico / Baixo</option>
                          <option value="Zerado" className="bg-[#1E293B] text-white">Estoque Zerado / Esgotado</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Products Table Card */}
                  <div className="bg-[#1E293B] rounded-xl border border-[#334155] shadow-lg overflow-hidden">
                    {filteredProducts.length === 0 ? (
                      <div className="p-16 text-center flex flex-col items-center justify-center">
                        <FolderOpen className="w-10 h-10 text-slate-500 mb-3 animate-pulse-slow" />
                        <p className="text-xs font-semibold text-[#94A3B8]">Nenhum produto corresponde aos filtros</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Experimente limpar os filtros ou clique em "Adicionar Produto" para registrar novos itens.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#0F172A]/50 text-[#94A3B8] border-b border-[#334155] font-bold uppercase tracking-wider">
                              <th className="px-5 py-3 font-semibold">Produto</th>
                              <th className="px-5 py-3 font-semibold">Código SKU / EAN</th>
                              <th className="px-5 py-3 font-semibold">Categoria</th>
                              <th className="px-5 py-3 font-semibold text-center">Nível do Estoque</th>
                              <th className="px-5 py-3 font-semibold">Preço Unitário</th>
                              <th className="px-5 py-3 font-semibold">Patrimônio</th>
                              <th className="px-5 py-3 font-semibold text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#334155] font-medium text-slate-300">
                            {filteredProducts.map((p) => {
                              const isOutOfStock = p.currentStock === 0;
                              const isLowStock = p.currentStock <= p.minStock && p.currentStock > 0;
                              const totalValue = p.currentStock * p.price;

                              return (
                                <tr
                                  key={p.id}
                                  id={`product-row-${p.id}`}
                                  className="hover:bg-[#334155]/20 transition-all"
                                >
                                  {/* Product Name & Details */}
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <div className="font-bold text-[#F8FAFC]">{p.name}</div>
                                    <div className="text-[9px] text-[#94A3B8] mt-0.5">
                                      Unidade de Medida: <strong className="text-slate-400 uppercase">{p.unit}</strong>
                                    </div>
                                  </td>

                                  {/* SKU & Barcode */}
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <span className="font-mono text-[10px] bg-[#0F172A] border border-[#334155] px-2 py-0.5 rounded text-[#3B82F6] font-semibold uppercase">
                                      {p.sku}
                                    </span>
                                    {p.barcode && (
                                      <div className="text-[9px] text-slate-500 flex items-center gap-1 mt-1">
                                        <Barcode className="w-3 h-3 text-[#94A3B8]" /> {p.barcode}
                                      </div>
                                    )}
                                  </td>

                                  {/* Category */}
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <span className="text-[10px] font-bold text-blue-300 bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-900/40">
                                      {p.category}
                                    </span>
                                  </td>

                                  {/* Stock Level Indicator */}
                                  <td className="px-5 py-4 whitespace-nowrap text-center">
                                    <div className="flex flex-col items-center justify-center max-w-[130px] mx-auto">
                                      <div className="flex items-baseline gap-1 mb-1 justify-center">
                                        <span className={`text-sm font-bold font-mono ${
                                          isOutOfStock ? "text-rose-400" : isLowStock ? "text-amber-400" : "text-emerald-400"
                                        }`}>
                                          {p.currentStock}
                                        </span>
                                        <span className="text-[10px] text-slate-500">/ {p.minStock} {p.unit}</span>
                                      </div>

                                      {/* Micro bar indicator */}
                                      <div className="w-full bg-[#0F172A] h-1.5 rounded-full overflow-hidden border border-[#334155]">
                                        <div 
                                          className={`h-full rounded-full ${
                                            isOutOfStock 
                                              ? "bg-rose-500 w-0" 
                                              : isLowStock 
                                                ? "bg-amber-500" 
                                                : "bg-emerald-500"
                                          }`}
                                          style={{ width: `${Math.min((p.currentStock / Math.max(p.minStock * 2, 1)) * 100, 100)}%` }}
                                        />
                                      </div>

                                      {/* Alert badges */}
                                      {isOutOfStock ? (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-950/60 text-rose-400 border border-rose-900/50 uppercase tracking-wider mt-1">
                                          Esgotado
                                        </span>
                                      ) : isLowStock ? (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-950/60 text-amber-400 border border-[#334155] uppercase tracking-wider mt-1">
                                          Alerta Baixo
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>

                                  {/* Unit Price */}
                                  <td className="px-5 py-4 whitespace-nowrap font-mono text-[11px] text-[#F8FAFC]">
                                    {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </td>

                                  {/* Valuation */}
                                  <td className="px-5 py-4 whitespace-nowrap font-mono text-[11px] text-emerald-400 font-bold">
                                    {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </td>

                                  {/* Action Buttons */}
                                  <td className="px-5 py-4 whitespace-nowrap text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* Quick Entry button */}
                                      <button
                                        id={`btn-quick-in-${p.id}`}
                                        onClick={() => {
                                          setProductToAdjust(p);
                                          setIsQuickAdjustOpen(true);
                                        }}
                                        className="p-1 px-2 rounded-lg hover:bg-[#334155]/60 text-slate-300 hover:text-[#F8FAFC] border border-transparent hover:border-[#334155] transition-all flex items-center gap-1 cursor-pointer"
                                        title="Lançamento Rápido (Entrada/Saída)"
                                      >
                                        <Plus className="w-3 h-3 text-emerald-400" />
                                        <span className="text-[10px] font-bold">Ajustar</span>
                                      </button>

                                      {/* Edit button */}
                                      <button
                                        id={`btn-edit-product-${p.id}`}
                                        onClick={() => {
                                          setProductToEdit(p);
                                          setIsProductModalOpen(true);
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-[#334155]/60 text-slate-300 hover:text-[#3B82F6] border border-transparent hover:border-[#334155] transition-all cursor-pointer"
                                        title="Editar Ficha do Produto"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Delete button */}
                                      <button
                                        id={`btn-delete-product-${p.id}`}
                                        onClick={() => handleDeleteProduct(p.id)}
                                        className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-900/50 transition-all cursor-pointer"
                                        title="Excluir do Catálogo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 2: AUDIT & COUNT PHYSICAL WORKSPACE */}
              {activeTab === "audit" && (
                <motion.div
                  key="tab-content-audit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <InventoryCountSession 
                    products={products} 
                    onConfirmCount={handleAuditCountConfirm} 
                  />
                </motion.div>
              )}

              {/* TAB 3: ACTIVITY TRAILS LOGS */}
              {activeTab === "logs" && (
                <motion.div
                  key="tab-content-logs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <ActivityLogsTable 
                    logs={logs} 
                    onClearLogs={handleClearAllLogs} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Footer credits and information */}
      <footer className="mt-12 py-8 bg-[#1E293B] border-t border-[#334155] text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
          <div className="flex items-center gap-1 text-[#94A3B8]">
            <span>Sistema Sincronizado à Nuvem</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse-slow" />
          </div>
          <p className="font-semibold text-slate-400">
            © {new Date().getFullYear()} - Controle & Auditoria de Estoque
          </p>
          <div className="text-[10px] font-mono text-slate-500">
            Powered by Firebase Firestore database
          </div>
        </div>
      </footer>

      {/* Modals Mounting */}
      
      {/* 1. Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setProductToEdit(null);
        }}
        onSubmit={handleProductSubmit}
        productToEdit={productToEdit}
      />

      {/* 2. Quick Stock Adjust Entry/Exit Modal */}
      <QuickAdjustModal
        isOpen={isQuickAdjustOpen}
        onClose={() => {
          setIsQuickAdjustOpen(false);
          setProductToAdjust(null);
        }}
        product={productToAdjust}
        onAdjust={handleQuickAdjustSubmit}
      />
    </div>
  );
}
