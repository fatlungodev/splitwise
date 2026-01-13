
import React, { useState, useMemo, useEffect } from 'react';
import { Group, User, Expense, Currency, SplitDetail } from './types';
import { MOCK_USERS, CURRENCIES, EXCHANGE_RATES, CATEGORIES } from './constants';
import Layout from './components/Layout';
import { calculateSimplifiedDebts } from './services/debtService';
import { scanReceipt } from './services/geminiService';

type Tab = 'Groups' | 'Friends' | 'Analysis' | 'Profile';
type SplitMode = 'equal' | 'custom';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Groups');
  const [groups, setGroups] = useState<Group[]>([
    {
      id: 'g1',
      title: 'Tokyo Trip 2026 🇯🇵',
      baseCurrency: 'HKD',
      members: MOCK_USERS,
      expenses: [],
      date: new Date().toISOString().slice(0, 16)
    }
  ]);
  const [friends, setFriends] = useState<User[]>(MOCK_USERS);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingFriendId, setEditingFriendId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Form States
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupCurrency, setNewGroupCurrency] = useState<Currency>('HKD');
  const [newGroupDate, setNewGroupDate] = useState(new Date().toISOString().slice(0, 16));
  const [newFriendName, setNewFriendName] = useState('');

  // Expense Form State
  const [desc, setDesc] = useState('');
  const [otherDesc, setOtherDesc] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>('HKD');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 16));
  const [payerId, setPayerId] = useState(friends[0]?.id || '');
  const [selectedSplitters, setSelectedSplitters] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Others');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});

  const activeGroup = useMemo(() => 
    groups.find(g => g.id === activeGroupId) || null,
  [groups, activeGroupId]);

  const settlements = useMemo(() => 
    activeGroup ? calculateSimplifiedDebts(activeGroup) : [], 
  [activeGroup]);

  const totalSpent = useMemo(() => 
    activeGroup ? activeGroup.expenses.reduce((sum, e) => sum + (e.amount * e.exchangeRate), 0) : 0,
  [activeGroup]);

  // Calculate Global Friend Balances
  const friendBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    friends.forEach(f => balances[f.id] = 0);

    groups.forEach(group => {
      group.expenses.forEach(exp => {
        const rate = exp.exchangeRate;
        if (exp.payerId === 'u1') {
          exp.splitDetails.forEach(sd => {
            if (sd.userId !== 'u1') {
              balances[sd.userId] = (balances[sd.userId] || 0) + (sd.amount * rate);
            }
          });
        } else {
          const myDebt = exp.splitDetails.find(sd => sd.userId === 'u1');
          if (myDebt) {
            balances[exp.payerId] = (balances[exp.payerId] || 0) - (myDebt.amount * rate);
          }
        }
      });
    });
    return balances;
  }, [groups, friends]);

  useEffect(() => {
    if (splitMode === 'equal' && amount > 0 && selectedSplitters.length > 0) {
      const perPerson = amount / selectedSplitters.length;
      const newSplits: Record<string, number> = {};
      selectedSplitters.forEach(id => {
        newSplits[id] = Number(perPerson.toFixed(2));
      });
      setCustomSplits(newSplits);
    }
  }, [amount, selectedSplitters, splitMode]);

  const openAddModal = () => {
    setEditingExpenseId(null);
    setDesc('');
    setOtherDesc('');
    setAmount(0);
    setCurrency(activeGroup?.baseCurrency || 'HKD');
    setExpenseDate(new Date().toISOString().slice(0, 16));
    setPayerId('u1');
    setSelectedSplitters(activeGroup?.members.map(u => u.id) || []);
    setSelectedCategory('Others');
    setSplitMode('equal');
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setDesc(expense.description);
    setOtherDesc(expense.category === 'Others' ? expense.description : '');
    setAmount(expense.amount);
    setCurrency(expense.currency);
    setExpenseDate(expense.date.slice(0, 16));
    setPayerId(expense.payerId);
    setSelectedSplitters(expense.splitDetails.map(s => s.userId));
    setSelectedCategory(expense.category);
    
    const splits: Record<string, number> = {};
    expense.splitDetails.forEach(s => {
      splits[s.userId] = s.amount;
    });
    setCustomSplits(splits);
    
    const isEqual = expense.splitDetails.every(s => Math.abs(s.amount - (expense.amount / expense.splitDetails.length)) < 0.1);
    setSplitMode(isEqual ? 'equal' : 'custom');
    setIsModalOpen(true);
  };

  const handleCreateGroup = () => {
    if (!newGroupTitle) return;
    const newGroup: Group = {
      id: Math.random().toString(36).substr(2, 9),
      title: newGroupTitle,
      baseCurrency: newGroupCurrency,
      members: friends,
      expenses: [],
      date: newGroupDate
    };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
    setIsGroupModalOpen(false);
    setNewGroupTitle('');
    setNewGroupDate(new Date().toISOString().slice(0, 16));
  };

  const handleAddOrEditFriend = () => {
    if (!newFriendName) return;
    
    if (editingFriendId) {
      setFriends(prev => prev.map(f => f.id === editingFriendId ? { ...f, name: newFriendName } : f));
      setGroups(prev => prev.map(g => ({
        ...g,
        members: g.members.map(m => m.id === editingFriendId ? { ...m, name: newFriendName } : m)
      })));
    } else {
      const newFriend: User = {
        id: 'u' + (friends.length + 1) + Math.random().toString(36).substr(2, 4),
        name: newFriendName,
        avatar: `https://picsum.photos/seed/${newFriendName}${Math.random()}/100`
      };
      setFriends(prev => [...prev, newFriend]);
    }
    
    setIsFriendModalOpen(false);
    setNewFriendName('');
    setEditingFriendId(null);
  };

  const handleDeleteFriend = (id: string) => {
    const balance = friendBalances[id] || 0;
    if (Math.abs(balance) > 0.1) {
      alert("Cannot delete a friend with an outstanding balance!");
      return;
    }
    if (confirm("Are you sure you want to remove this friend?")) {
      setFriends(prev => prev.filter(f => f.id !== id));
      setGroups(prev => prev.map(g => ({
        ...g,
        members: g.members.filter(m => m.id !== id)
      })));
      setIsFriendModalOpen(false);
      setEditingFriendId(null);
      setNewFriendName('');
    }
  };

  const handleSaveExpense = () => {
    if (!activeGroup || amount <= 0 || selectedSplitters.length === 0) return;

    // Use specific description if "Others", otherwise use general description or category name
    const finalDesc = selectedCategory === 'Others' ? (otherDesc || 'Others') : (desc || selectedCategory);

    let finalSplitDetails: SplitDetail[] = [];
    if (splitMode === 'equal') {
      const perPerson = amount / selectedSplitters.length;
      finalSplitDetails = selectedSplitters.map(id => ({
        userId: id,
        amount: perPerson
      }));
    } else {
      finalSplitDetails = selectedSplitters.map(id => ({
        userId: id,
        amount: customSplits[id] || 0
      }));
    }

    const updatedGroups = groups.map(g => {
      if (g.id !== activeGroupId) return g;
      
      let newExpenses;
      if (editingExpenseId) {
        newExpenses = g.expenses.map(e => 
          e.id === editingExpenseId 
            ? { ...e, description: finalDesc, amount, currency, exchangeRate: EXCHANGE_RATES[currency], payerId, splitDetails: finalSplitDetails, category: selectedCategory, date: expenseDate }
            : e
        );
      } else {
        const newExpense: Expense = {
          id: Math.random().toString(36).substr(2, 9),
          groupId: g.id,
          description: finalDesc,
          amount,
          currency,
          exchangeRate: EXCHANGE_RATES[currency],
          payerId,
          splitDetails: finalSplitDetails,
          date: expenseDate,
          category: selectedCategory
        };
        newExpenses = [newExpense, ...g.expenses];
      }
      return { ...g, expenses: newExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
    });

    setGroups(updatedGroups);
    setIsModalOpen(false);
  };

  const currentTotalSplit = useMemo(() => {
    return selectedSplitters.reduce((sum, id) => sum + (customSplits[id] || 0), 0);
  }, [customSplits, selectedSplitters]);

  const splitDifference = useMemo(() => amount - currentTotalSplit, [amount, currentTotalSplit]);

  const handleCustomSplitChange = (userId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setCustomSplits(prev => ({ ...prev, [userId]: num }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const data = await scanReceipt(base64);
      if (data) {
        setDesc(data.description || 'Scanned Receipt');
        setAmount(data.amount || 0);
        const cur = String(data.currency).toUpperCase() as Currency;
        if (CURRENCIES.includes(cur)) setCurrency(cur);
        if (data.category) setSelectedCategory(data.category);
      }
      setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Delete this expense?')) {
      setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, expenses: g.expenses.filter(e => e.id !== id) } : g));
      setIsModalOpen(false);
    }
  };

  const renderGroupList = () => (
    <div className="px-6 py-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">My Events</h2>
        <button 
          onClick={() => setIsGroupModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all"
        >
          + New Event
        </button>
      </div>
      <div className="space-y-4">
        {groups.map(group => (
          <div 
            key={group.id} 
            onClick={() => { setActiveGroupId(group.id); setActiveTab('Groups'); }}
            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 cursor-pointer hover:border-indigo-300 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                {group.expenses.length > 0 ? '💰' : '🗓️'}
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{group.title}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {new Date(group.date).toLocaleDateString()} • {group.members.length} members
                </p>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-slate-300"></i>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFriends = () => (
    <div className="px-6 py-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Friends</h2>
        <button 
          onClick={() => { setEditingFriendId(null); setNewFriendName(''); setIsFriendModalOpen(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all"
        >
          + Add Friend
        </button>
      </div>
      
      <div className="bg-indigo-50 p-4 rounded-2xl mb-6 border border-indigo-100">
        <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Overall Balance</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-black text-indigo-900">
            ${Object.values(friendBalances).reduce((a: number, b: number) => a + b, 0).toFixed(1)}
          </span>
          <span className="text-xs font-bold text-indigo-400 mb-1">HKD Total Owed to You</span>
        </div>
      </div>

      <div className="space-y-4">
        {friends.filter(f => f.id !== 'u1').map(user => {
          const balance = friendBalances[user.id] || 0;
          return (
            <div 
              key={user.id} 
              onClick={() => { setEditingFriendId(user.id); setNewFriendName(user.name); setIsFriendModalOpen(true); }}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-50 transition-all hover:shadow-md cursor-pointer group"
            >
              <img src={user.avatar} className="w-12 h-12 rounded-full border-2 border-indigo-100" />
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{user.name}</h4>
                <p className={`text-xs font-bold ${balance > 0 ? 'text-emerald-500' : balance < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {balance > 0 ? `owes you $${balance.toFixed(1)}` : balance < 0 ? `you owe $${Math.abs(balance).toFixed(1)}` : 'settled up'}
                </p>
              </div>
              <div className="flex gap-2">
                {Math.abs(balance) > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); alert(`Reminded ${user.name}!`); }}
                    className="bg-slate-50 text-indigo-600 text-[10px] font-black px-3 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-tighter"
                  >
                    REMIND
                  </button>
                )}
                <i className="fa-solid fa-pen-to-square text-slate-300 group-hover:text-indigo-400 self-center px-2"></i>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderActiveGroup = () => {
    if (!activeGroup) return null;
    return (
      <div className="">
        <div className="bg-indigo-600 text-white px-6 pb-8 pt-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
          <div className="mb-8 flex items-center">
            <button 
              onClick={() => setActiveGroupId(null)}
              className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md px-5 py-3 rounded-2xl transition-all shadow-sm border border-white/10"
              aria-label="Back to My Events"
            >
              <i className="fa-solid fa-arrow-left text-xl group-hover:-translate-x-1 transition-transform"></i>
              <span className="text-sm font-black uppercase tracking-widest">Back to Events</span>
            </button>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-4xl shadow-inner rotate-3">✈️</div>
            <div className="flex-1">
              <h2 className="text-3xl font-black leading-tight tracking-tight">{activeGroup.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                 <span className="bg-white/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/20 shadow-sm">{activeGroup.baseCurrency}</span>
                 <p className="opacity-70 text-[10px] font-black uppercase tracking-widest">{new Date(activeGroup.date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-3xl border border-white/10 shadow-sm">
              <span className="text-[10px] uppercase font-black tracking-widest block opacity-60 mb-1">Total Spending</span>
              <span className="text-xl font-black">${totalSpent.toFixed(1)} <span className="text-xs opacity-60">{activeGroup.baseCurrency}</span></span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-3xl border border-white/10 shadow-sm">
              <span className="text-[10px] uppercase font-black tracking-widest block opacity-60 mb-1">Group Size</span>
              <span className="text-xl font-black">{activeGroup.members.length} <span className="text-xs opacity-60">Members</span></span>
            </div>
          </div>
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
        </div>
        
        <div className="px-6 py-8">
          <div className="mb-10">
            <div className="flex justify-between items-center mb-5 px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Settle Balance</h3>
              <div className="h-px bg-slate-100 flex-1 ml-4"></div>
            </div>
            <div className="space-y-4">
              {settlements.length === 0 ? (
                <div className="py-10 bg-slate-50 text-center rounded-[2.5rem] border-2 border-dashed border-slate-200/60">
                   <div className="text-3xl mb-2">✨</div>
                   <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Perfectly Balanced</p>
                </div>
              ) : (
                settlements.map((s, idx) => {
                  const fromUser = activeGroup.members.find(m => m.id === s.from);
                  const toUser = activeGroup.members.find(m => m.id === s.to);
                  return (
                    <div key={idx} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm animate-in slide-in-from-right duration-500 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-4">
                          <img src={fromUser?.avatar} className="w-12 h-12 rounded-2xl border-4 border-white shadow-lg" />
                          <img src={toUser?.avatar} className="w-12 h-12 rounded-2xl border-4 border-white shadow-lg" />
                        </div>
                        <div className="text-xs font-bold text-slate-500 leading-relaxed">
                          <span className="font-black text-slate-800 text-sm block">{fromUser?.name}</span>
                          <span className="text-[10px] uppercase tracking-wider block">Owes {toUser?.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-rose-500">${s.amount.toFixed(1)}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{activeGroup.baseCurrency}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-5 px-1">
               <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Expense History</h3>
               <div className="h-px bg-slate-100 flex-1 ml-4"></div>
            </div>
            <div className="space-y-5">
              {activeGroup.expenses.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200/60">
                  <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-5 text-slate-300">
                    <i className="fa-solid fa-receipt text-3xl"></i>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">No expenses recorded</p>
                </div>
              )}
              {activeGroup.expenses.map((expense) => {
                const payer = activeGroup.members.find(m => m.id === expense.payerId);
                const cat = CATEGORIES.find(c => c.name === expense.category) || CATEGORIES[5];
                return (
                  <div 
                    key={expense.id} 
                    onClick={() => openEditModal(expense)} 
                    className="flex items-center gap-5 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 cursor-pointer hover:shadow-xl hover:border-indigo-100 transition-all active:scale-[0.98] group"
                  >
                    <div className={`w-14 h-14 rounded-3xl ${cat.color} flex items-center justify-center text-white text-2xl shadow-xl shadow-inner group-hover:scale-110 transition-transform`}>
                      <i className={`fa-solid ${cat.icon}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-800 text-lg leading-tight truncate tracking-tight">{expense.description}</h4>
                        <span className="text-[9px] font-black text-slate-300 uppercase whitespace-nowrap ml-2">
                          {new Date(expense.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <img src={payer?.avatar} className="w-4 h-4 rounded-full" />
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{payer?.name} paid</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-800 text-lg tracking-tight">{expense.amount} <span className="text-xs text-slate-400">{expense.currency}</span></div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">~{(expense.amount * expense.exchangeRate).toFixed(0)} {activeGroup.baseCurrency}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'Groups' && (activeGroupId ? renderActiveGroup() : renderGroupList())}
      {activeTab === 'Friends' && renderFriends()}
      {activeTab === 'Analysis' && (
        <div className="px-6 py-8">
          <h2 className="text-2xl font-black text-slate-800 mb-8 tracking-tight px-1">Spending Analysis</h2>
          {(!activeGroup || activeGroup.expenses.length === 0) ? (
            <div className="text-center py-32 text-slate-400">
              <i className="fa-solid fa-chart-pie text-7xl mb-6 opacity-10"></i>
              <p className="text-xs font-black uppercase tracking-[0.2em]">Insights will appear here</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="p-10 bg-white rounded-[3.5rem] shadow-sm border border-slate-100">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 text-center">Expenditure by Category</h3>
                <div className="space-y-8">
                  {CATEGORIES.map(cat => {
                    const amount = activeGroup.expenses
                      .filter(e => e.category === cat.name)
                      .reduce((sum, e) => sum + (e.amount * e.exchangeRate), 0);
                    if (amount === 0) return null;
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between text-[11px] font-black mb-3 uppercase tracking-widest">
                          <span className="text-slate-500 flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${cat.color} shadow-sm`}></div> {cat.name}
                          </span>
                          <span className="text-slate-900">${amount.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-slate-50 h-4 rounded-full overflow-hidden shadow-inner p-0.5">
                          <div 
                            className={`${cat.color} h-full transition-all duration-1000 ease-out rounded-full shadow-sm`} 
                            style={{ width: `${(amount / totalSpent) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'Profile' && (
        <div className="px-6 py-12 text-center">
          <div className="relative inline-block mb-10">
            <div className="w-36 h-36 bg-indigo-600 rounded-[3rem] absolute -inset-2 rotate-6 opacity-10"></div>
            <img src={friends[0]?.avatar} className="w-32 h-32 rounded-[2.5rem] border-8 border-white shadow-2xl relative z-10" />
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-3xl border-8 border-white flex items-center justify-center text-white text-sm shadow-xl z-20">
              <i className="fa-solid fa-check"></i>
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{friends[0]?.name}</h2>
          <div className="inline-block mt-2 px-4 py-1.5 bg-indigo-50 rounded-full">
            <p className="text-indigo-500 font-black uppercase text-[10px] tracking-[0.25em]">Splitify Elite Member</p>
          </div>
          
          <div className="space-y-4 mt-12">
             <button className="w-full p-8 bg-white text-slate-700 font-bold rounded-[3rem] border border-slate-100 text-left flex items-center justify-between group hover:shadow-xl hover:bg-indigo-50/50 hover:border-indigo-100 transition-all shadow-sm">
               <div className="flex items-center gap-5">
                 <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform"><i className="fa-solid fa-credit-card text-xl"></i></div>
                 <span className="text-sm font-black uppercase tracking-widest">Payment Wallets</span>
               </div>
               <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-2 transition-all"></i>
             </button>
             <button className="w-full p-8 bg-white text-slate-700 font-bold rounded-[3rem] border border-slate-100 text-left flex items-center justify-between group hover:shadow-xl hover:bg-indigo-50/50 hover:border-indigo-100 transition-all shadow-sm">
               <div className="flex items-center gap-5">
                 <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform"><i className="fa-solid fa-file-export text-xl"></i></div>
                 <span className="text-sm font-black uppercase tracking-widest">Export Ledger</span>
               </div>
               <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-2 transition-all"></i>
             </button>
          </div>
        </div>
      )}

      {activeTab === 'Groups' && activeGroupId && (
        <button onClick={openAddModal} className="fixed bottom-28 right-8 w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-2xl flex items-center justify-center text-4xl hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all z-50 shadow-indigo-300 ring-8 ring-white/50 backdrop-blur-sm">
          <i className="fa-solid fa-plus"></i>
        </button>
      )}

      {/* New Event Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-slate-800 mb-8 text-center tracking-tight">Create Event</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-1">What's the plan?</label>
                <input 
                  type="text" 
                  placeholder="e.g. Europe Trip"
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 outline-none transition-all font-black text-slate-800 placeholder:text-slate-300"
                  value={newGroupTitle}
                  onChange={(e) => setNewGroupTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-1">Event Date</label>
                <input 
                  type="datetime-local"
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-slate-800 outline-none"
                  value={newGroupDate}
                  onChange={(e) => setNewGroupDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-1">Base Currency</label>
                <select 
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black outline-none cursor-pointer appearance-none text-slate-800"
                  value={newGroupCurrency}
                  onChange={(e) => setNewGroupCurrency(e.target.value as Currency)}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-3 mt-6">
                <button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupTitle}
                  className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] disabled:bg-slate-100 disabled:text-slate-300 shadow-2xl shadow-indigo-100 active:scale-95 transition-all"
                >
                  Confirm Event
                </button>
                <button onClick={() => setIsGroupModalOpen(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] hover:text-rose-500 transition-colors">Discard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Friend Modal */}
      {isFriendModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300 border border-slate-100">
            <h3 className="text-2xl font-black text-slate-800 mb-8 text-center tracking-tight">
              {editingFriendId ? 'Edit Friend' : 'Add Friend'}
            </h3>
            <div className="space-y-8">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. David Smith"
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 outline-none transition-all font-black placeholder:text-slate-300 text-slate-800"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-3 mt-10">
                <button 
                  onClick={handleAddOrEditFriend}
                  disabled={!newFriendName}
                  className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] disabled:bg-slate-100 disabled:text-slate-300 shadow-2xl shadow-indigo-100 active:scale-95 transition-all"
                >
                  {editingFriendId ? 'Update Info' : 'Add Contact'}
                </button>
                {editingFriendId && (
                  <button 
                    onClick={() => handleDeleteFriend(editingFriendId)}
                    className="w-full bg-rose-50 text-rose-500 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                  >
                    Delete Friend
                  </button>
                )}
                <button 
                  onClick={() => { setIsFriendModalOpen(false); setEditingFriendId(null); setNewFriendName(''); }} 
                  className="w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] hover:text-indigo-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[4rem] sm:rounded-[4rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[92vh] flex flex-col border-t border-white/20">
            <div className="p-10 overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{editingExpenseId ? 'Edit Entry' : 'New Entry'}</h3>
                <div className="flex items-center gap-5">
                  {editingExpenseId && (
                    <button onClick={() => handleDeleteExpense(editingExpenseId)} className="w-12 h-12 text-rose-500 bg-rose-50 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="fa-solid fa-trash-can text-lg"></i></button>
                  )}
                  <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-2xl flex items-center justify-center transition-all">
                    <i className="fa-solid fa-times text-2xl"></i>
                  </button>
                </div>
              </div>

              {!editingExpenseId && (
                <div className="mb-10">
                  <label className="relative flex items-center justify-center gap-5 w-full p-8 border-4 border-dashed border-indigo-100 rounded-[3rem] bg-indigo-50/20 cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isScanning} />
                    {isScanning ? (
                      <div className="flex items-center gap-4 text-indigo-600 font-black animate-pulse uppercase text-sm tracking-[0.2em]">
                        <i className="fa-solid fa-circle-notch fa-spin text-xl"></i>
                        <span>AI Parsing...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                           <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
                        </div>
                        <span className="font-black text-sm text-indigo-600 uppercase tracking-[0.2em]">Scan Receipt</span>
                      </>
                    )}
                  </label>
                </div>
              )}

              <div className="space-y-8">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block px-2">Categorize</label>
                  <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide px-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.name} onClick={() => setSelectedCategory(cat.name)} className={`flex-shrink-0 flex items-center gap-4 px-6 py-4 rounded-3xl border transition-all ${selectedCategory === cat.name ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}>
                        <i className={`fa-solid ${cat.icon} text-sm`}></i>
                        <span className="text-[11px] font-black uppercase tracking-widest">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCategory === 'Others' ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-2">What is this for?</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Movie Tickets, Shared Gift" 
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 transition-all font-black text-slate-800 outline-none placeholder:text-slate-300" 
                      value={otherDesc} 
                      onChange={(e) => setOtherDesc(e.target.value)} 
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-2">Notes (Optional)</label>
                    <input 
                      type="text" 
                      placeholder={`Details about this ${selectedCategory.toLowerCase()}`} 
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 transition-all font-black text-slate-800 outline-none placeholder:text-slate-300" 
                      value={desc} 
                      onChange={(e) => setDesc(e.target.value)} 
                    />
                  </div>
                )}
                
                <div className="flex gap-5">
                  <div className="flex-[2]">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-2">Value</label>
                    <input type="number" placeholder="0.00" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-2xl text-slate-800 outline-none" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-2">Currency</label>
                    <select className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-slate-800 outline-none cursor-pointer" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-2">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-slate-800 outline-none" 
                    value={expenseDate} 
                    onChange={(e) => setExpenseDate(e.target.value)} 
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-100 rounded-[2.5rem] shadow-inner">
                   <button onClick={() => setSplitMode('equal')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] rounded-3xl transition-all ${splitMode === 'equal' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Equal Split</button>
                   <button onClick={() => setSplitMode('custom')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] rounded-3xl transition-all ${splitMode === 'custom' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Custom</button>
                </div>

                {splitMode === 'custom' && (
                  <div className="p-8 bg-indigo-50/30 rounded-[3.5rem] border border-indigo-50/50 shadow-inner animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-6 px-2">
                      <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Unallocated</span>
                      <span className={`text-base font-black ${Math.abs(splitDifference) < 0.01 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {splitDifference.toFixed(2)} <span className="text-[10px] opacity-60">{currency}</span>
                      </span>
                    </div>
                    <div className="space-y-5">
                       {activeGroup?.members.map(user => {
                         const isSelected = selectedSplitters.includes(user.id);
                         return (
                           <div key={user.id} className={`flex items-center gap-5 transition-all ${isSelected ? 'opacity-100 translate-x-1' : 'opacity-20 scale-95 grayscale'}`}>
                             <img src={user.avatar} className="w-12 h-12 rounded-[1.25rem] shadow-md border-4 border-white" />
                             <span className="text-xs font-black text-slate-700 flex-1 truncate uppercase tracking-tight">{user.name}</span>
                             <div className="relative">
                               <input 
                                 type="number" 
                                 disabled={!isSelected}
                                 className="w-28 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-right text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm"
                                 value={customSplits[user.id] || ''} 
                                 onChange={(e) => handleCustomSplitChange(user.id, e.target.value)}
                               />
                             </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block px-2">Payer</label>
                  <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide px-2">
                    {activeGroup?.members.map(user => (
                      <button key={user.id} onClick={() => setPayerId(user.id)} className={`flex-shrink-0 flex items-center gap-4 px-6 py-4 rounded-3xl border transition-all ${payerId === user.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}>
                        <img src={user.avatar} className="w-8 h-8 rounded-xl shadow-sm border-2 border-white/20" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{user.id === 'u1' ? 'Myself' : user.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block px-2">Include in Split</label>
                  <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide px-2">
                    {activeGroup?.members.map(user => {
                      const isSelected = selectedSplitters.includes(user.id);
                      return (
                        <button key={user.id} onClick={() => setSelectedSplitters(prev => isSelected ? prev.filter(id => id !== user.id) : [...prev, user.id])} className={`flex-shrink-0 flex flex-col items-center gap-4 p-5 rounded-[2.5rem] border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-300 shadow-md scale-110' : 'bg-white border-slate-100 grayscale opacity-40 hover:opacity-100'}`}>
                          <img src={user.avatar} className={`w-14 h-14 rounded-[1.5rem] transition-all ${isSelected ? 'ring-8 ring-indigo-500/10 shadow-lg' : ''}`} />
                          <span className={`text-[11px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>{user.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveExpense} 
                disabled={!selectedCategory || amount <= 0 || selectedSplitters.length === 0 || (splitMode === 'custom' && Math.abs(splitDifference) > 0.01) || (selectedCategory === 'Others' && !otherDesc)} 
                className="w-full mt-12 bg-indigo-600 text-white py-8 rounded-[3rem] font-black uppercase text-base tracking-[0.3em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 active:scale-[0.98] transition-all mb-12"
              >
                {editingExpenseId ? 'Commit Changes' : 'Post Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
