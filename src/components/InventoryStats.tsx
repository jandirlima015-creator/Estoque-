import { Package, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { motion } from "motion/react";
import { Product, StockLog } from "../firebase";

interface InventoryStatsProps {
  products: Product[];
  logs: StockLog[];
}

export default function InventoryStats({ products, logs }: InventoryStatsProps) {
  // Cálculos de Estatísticas
  const totalItems = products.length;
  
  const lowStockProducts = products.filter(
    (p) => p.currentStock <= p.minStock
  );
  const lowStockCount = lowStockProducts.length;

  const totalValue = products.reduce(
    (acc, p) => acc + (p.currentStock * p.price),
    0
  );

  const lastActivityDate = logs.length > 0 
    ? new Date(logs[0].timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + " - " + new Date(logs[0].timestamp).toLocaleDateString("pt-BR")
    : "Nenhuma atividade recente";

  const cards = [
    {
      id: "stat-total",
      title: "Total de Produtos",
      value: totalItems,
      subtitle: `${products.reduce((acc, p) => acc + p.currentStock, 0)} unidades`,
      icon: Package,
      color: "from-blue-500 to-indigo-600",
      textColor: "text-blue-400",
      bgColor: "bg-blue-950/40",
      borderColor: "border-slate-800"
    },
    {
      id: "stat-low",
      title: "Estoque Baixo",
      value: lowStockCount,
      subtitle: lowStockCount > 0 ? "Requer reposição" : "Estoque regular",
      icon: AlertTriangle,
      color: lowStockCount > 0 ? "from-rose-500 to-amber-600 animate-pulse-slow" : "from-emerald-500 to-teal-600",
      textColor: lowStockCount > 0 ? "text-rose-400" : "text-emerald-400",
      bgColor: lowStockCount > 0 ? "bg-rose-950/40" : "bg-emerald-950/40",
      borderColor: "border-slate-800"
    },
    {
      id: "stat-value",
      title: "Patrimônio do Estoque",
      value: totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      subtitle: "Valor de venda",
      icon: TrendingUp,
      color: "from-emerald-500 to-green-600",
      textColor: "text-emerald-400",
      bgColor: "bg-emerald-950/40",
      borderColor: "border-slate-800"
    },
    {
      id: "stat-activity",
      title: "Última Movimentação",
      value: logs.length > 0 ? logs[0].productName.split(" ")[0] + "..." : "Nenhuma",
      subtitle: lastActivityDate,
      icon: Activity,
      color: "from-purple-500 to-pink-600",
      textColor: "text-purple-400",
      bgColor: "bg-purple-950/40",
      borderColor: "border-slate-800"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.id}
            id={card.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ y: -3 }}
            className="p-5 rounded-xl bg-[#1E293B] border border-[#334155] shadow-md flex items-start justify-between relative overflow-hidden"
          >
            {/* Visual gradient accent */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.color}`} />
            
            <div className="flex-1 min-w-0 pr-4">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">
                {card.title}
              </span>
              <h3 className="text-xl font-extrabold font-display text-[#F8FAFC] tracking-tight leading-none mb-2">
                {card.value}
              </h3>
              <p className="text-xs font-medium text-slate-400 truncate">
                {card.subtitle}
              </p>
            </div>
            
            <div className={`p-2.5 rounded-lg ${card.bgColor} ${card.textColor} flex-shrink-0 flex items-center justify-center border border-[#334155]`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
