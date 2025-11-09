import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, Edit2, Clock, Repeat, Bell, BellOff, AlertCircle, Check, X } from 'lucide-react';

// 型定義
type NotificationType = 'sound' | 'alert' | 'none';

type FlowNode = {
  id: string;
  type: 'timer' | 'loop' | 'notification';
  minutes?: number;
  loopCount?: number;
  notificationType?: NotificationType;
  children?: FlowNode[];
};

type TimerPreset = {
  id: string;
  name: string;
  flow: FlowNode[];
};

type Task = {
  id: string;
  name: string;
  totalMinutes: number;
};

type TimerState = 'idle' | 'running' | 'paused';

// ローカルストレージのキー
const STORAGE_KEYS = {
  TIMERS: 'timerPresets',
  TASKS: 'tasks',
};

// App Component
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timer' | 'running' | 'tasks'>('timer');
  const [timerPresets, setTimerPresets] = useState<TimerPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isEditingPresetName, setIsEditingPresetName] = useState(false);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // ローカルストレージからデータ読み込み
  useEffect(() => {
    const savedTimers = localStorage.getItem(STORAGE_KEYS.TIMERS);
    const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    
    if (savedTimers) {
      setTimerPresets(JSON.parse(savedTimers));
    }
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  // ローカルストレージに保存
  useEffect(() => {
    if (timerPresets.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TIMERS, JSON.stringify(timerPresets));
    }
  }, [timerPresets]);

  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    }
  }, [tasks]);

  // タイマー機能
  const startTimer = () => {
    if (!selectedPresetId) return;
    
    const preset = timerPresets.find(p => p.id === selectedPresetId);
    if (!preset || preset.flow.length === 0) return;

    const total = calculateTotalSeconds(preset.flow);
    setTotalSeconds(total);
    setCurrentSeconds(total);
    setTimerState('running');
    startTimeRef.current = Date.now();

    intervalRef.current = window.setInterval(() => {
      setCurrentSeconds(prev => {
        if (prev <= 1) {
          stopTimer();
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState('paused');
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // タスクに時間を記録
    if (selectedTaskId && timerState === 'running') {
      const elapsedSeconds = totalSeconds - currentSeconds;
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      
      setTasks(prev => prev.map(task => 
        task.id === selectedTaskId 
          ? { ...task, totalMinutes: task.totalMinutes + elapsedMinutes }
          : task
      ));
    }
    
    setTimerState('idle');
    setCurrentSeconds(0);
    setTotalSeconds(0);
  };

  const resetTimer = () => {
    if (timerState === 'running') return;
    
    stopTimer();
  };

  const handleTimerComplete = () => {
    // タスクに時間を記録
    if (selectedTaskId && totalSeconds > 0) {
      const elapsedMinutes = Math.floor(totalSeconds / 60);
      
      setTasks(prev => prev.map(task => 
        task.id === selectedTaskId 
          ? { ...task, totalMinutes: task.totalMinutes + elapsedMinutes }
          : task
      ));
    }

    if (Notification.permission === 'granted') {
      new Notification('タイマー終了', {
        body: 'タイマーが完了しました！',
        icon: '⏰'
      });
    }
    
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGK27OihUBALTqfj8bllHQc2jtTxy3kuBSh+zPDdkj0KE1iy6duqVxQLRJne8r1sIQUrgs/z2Yk1CBdftOrpollDCk6n5fK6aR0HNozU8sp5LgUqftDw3ZI7ChJYsunaqVYVDEOY3vK8bCAFK4PP8tmINQgXXbTo6aNYEQtNp+Xxu2oeByuAzvHZiTUIGGS47+mjURUMT6jl8rxsHwUnfM3v3I9ACxZat+rqpVcVDEKV3O+7bCEGLYXR89mJMwgXYLbr6aFaEwxOqOXyu2odBjKFzu/biTQIGGq+8OmnURUMTqfl8rxsHgcofc7w3pBAChZas+naqVYVDEOY3vK8bCAFK4LP8tiIOQgYYrjs6qJZEQtNp+Xzu2oeByuBzvHZiTUIGGO4+OijUhUMT6jl8btqHQcrhM/v14k1CBllvO/op1EVDUyn5fG7ax4HKn7P8N2SPAoSWLLp26lXFQxDmN7yvGwgBSuCz/PYiDUIGGK47Oqhkg==');
    audio.play().catch(() => {});
  };

  const calculateTotalSeconds = (nodes: FlowNode[]): number => {
    let total = 0;
    
    nodes.forEach(node => {
      if (node.type === 'timer' && node.minutes) {
        total += node.minutes * 60;
      } else if (node.type === 'loop' && node.children && node.loopCount) {
        const childTotal = calculateTotalSeconds(node.children);
        total += childTotal * node.loopCount;
      }
    });
    
    return total;
  };

  // タイマープリセット管理
  const addNewPreset = () => {
    const newPreset: TimerPreset = {
      id: Date.now().toString(),
      name: `タイマー${timerPresets.length + 1}`,
      flow: []
    };
    setTimerPresets([...timerPresets, newPreset]);
    setSelectedPresetId(newPreset.id);
  };

  const deletePreset = (id: string) => {
    setTimerPresets(prev => prev.filter(p => p.id !== id));
    if (selectedPresetId === id) {
      setSelectedPresetId(null);
    }
  };

  const updatePresetName = (id: string, name: string) => {
    setTimerPresets(prev => prev.map(p => 
      p.id === id ? { ...p, name } : p
    ));
  };

  const updatePresetFlow = (id: string, flow: FlowNode[]) => {
    setTimerPresets(prev => prev.map(p => 
      p.id === id ? { ...p, flow } : p
    ));
  };

  // タスク管理
  const addTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      name: '新しいタスク',
      totalMinutes: 0
    };
    setTasks([...tasks, newTask]);
    setEditingTaskId(newTask.id);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
    }
  };

  const updateTaskName = (id: string, name: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, name } : t
    ));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:00`;
  };

  const selectedPreset = timerPresets.find(p => p.id === selectedPresetId);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const progress = totalSeconds > 0 ? ((totalSeconds - currentSeconds) / totalSeconds) * 100 : 0;

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* モバイル用タブ */}
      <div className="md:hidden mb-4 flex gap-2">
        <button
          onClick={() => setActiveTab('timer')}
          className={`flex-1 py-2 rounded ${activeTab === 'timer' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          タイマー設定
        </button>
        <button
          onClick={() => setActiveTab('running')}
          className={`flex-1 py-2 rounded ${activeTab === 'running' ? 'bg-yellow-600' : 'bg-gray-700'}`}
        >
          実行中
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-2 rounded ${activeTab === 'tasks' ? 'bg-green-600' : 'bg-gray-700'}`}
        >
          タスク
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
        {/* タイマー設定パネル */}
        <div className={`bg-gray-800 rounded-lg p-6 ${activeTab !== 'timer' ? 'hidden md:block' : ''}`}>
          <h2 className="text-2xl font-bold text-blue-400 mb-4">タイマー</h2>
          
          <div className="mb-4">
            <select
              value={selectedPresetId || ''}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded"
            >
              <option value="">タイマーを選択</option>
              {timerPresets.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={addNewPreset}
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded mb-4 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            新しいタイマー
          </button>

          {selectedPreset && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {isEditingPresetName ? (
                  <>
                    <input
                      type="text"
                      value={editingPresetName}
                      onChange={(e) => setEditingPresetName(e.target.value)}
                      className="flex-1 bg-gray-700 p-2 rounded"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        updatePresetName(selectedPreset.id, editingPresetName);
                        setIsEditingPresetName(false);
                      }}
                      className="bg-green-600 p-2 rounded"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setIsEditingPresetName(false)}
                      className="bg-red-600 p-2 rounded"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-semibold">{selectedPreset.name}</span>
                    <button
                      onClick={() => {
                        setEditingPresetName(selectedPreset.name);
                        setIsEditingPresetName(true);
                      }}
                      className="bg-gray-700 p-2 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deletePreset(selectedPreset.id)}
                      className="bg-red-600 p-2 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>

              <FlowEditor
                flow={selectedPreset.flow}
                onUpdateFlow={(flow) => updatePresetFlow(selectedPreset.id, flow)}
              />
            </div>
          )}
        </div>

        {/* タイマー実行パネル */}
        <div className={`bg-gray-800 rounded-lg p-6 ${activeTab !== 'running' ? 'hidden md:block' : ''}`}>
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">
            {selectedPreset ? selectedPreset.name : 'タイマー'}
          </h2>

          {/* モバイル用：タイマー選択 */}
          <div className="md:hidden mb-4">
            <label className="text-sm text-gray-400 block mb-2">タイマーを選択</label>
            <select
              value={selectedPresetId || ''}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded"
            >
              <option value="">タイマーを選択</option>
              {timerPresets.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </div>

          {/* タスク選択 */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 block mb-2">タスクを選択（任意）</label>
            <select
              value={selectedTaskId || ''}
              onChange={(e) => setSelectedTaskId(e.target.value || null)}
              className="w-full bg-gray-700 text-white p-2 rounded"
            >
              <option value="">タスクなし</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.name} ({formatMinutes(task.totalMinutes)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col items-center justify-center space-y-6 py-8">
            {/* 円形プログレスバー */}
            <div className="relative w-64 h-64">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="16"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="16"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-bold text-yellow-400">
                  {formatTime(currentSeconds)}
                </span>
              </div>
            </div>

            {/* コントロールボタン */}
            <div className="flex gap-4">
              {timerState === 'idle' && (
                <button
                  onClick={startTimer}
                  disabled={!selectedPresetId || !selectedPreset?.flow.length}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <Play size={20} />
                  開始
                </button>
              )}
              
              {timerState === 'running' && (
                <button
                  onClick={pauseTimer}
                  className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <Pause size={20} />
                  一時停止
                </button>
              )}
              
              {timerState === 'paused' && (
                <button
                  onClick={startTimer}
                  className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <Play size={20} />
                  再開
                </button>
              )}

              <button
                onClick={resetTimer}
                disabled={timerState === 'running'}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <RotateCcw size={20} />
                リセット
              </button>

              {timerState !== 'idle' && (
                <button
                  onClick={stopTimer}
                  className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg"
                >
                  停止
                </button>
              )}
            </div>
          </div>
        </div>

        {/* タスク管理パネル */}
        <div className={`bg-gray-800 rounded-lg p-6 ${activeTab !== 'tasks' ? 'hidden md:block' : ''}`}>
          <h2 className="text-2xl font-bold text-green-400 mb-4">タスク</h2>

          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-2">選択中</div>
            {selectedTask && (
              <div className="bg-gray-700 p-3 rounded flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  {selectedTask.name}
                </span>
                <span className="text-green-400 font-mono">
                  {formatMinutes(selectedTask.totalMinutes)}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={addTask}
            className="w-full bg-green-600 hover:bg-green-700 py-2 rounded mb-4 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            新しいタスク
          </button>

          <div className="text-sm text-gray-400 mb-2">リスト</div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                isEditing={editingTaskId === task.id}
                onSelect={() => setSelectedTaskId(task.id)}
                onDelete={() => deleteTask(task.id)}
                onUpdateName={(name) => updateTaskName(task.id, name)}
                onStartEdit={() => setEditingTaskId(task.id)}
                onEndEdit={() => setEditingTaskId(null)}
                formatMinutes={formatMinutes}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// フローエディターコンポーネント
const FlowEditor: React.FC<{
  flow: FlowNode[];
  onUpdateFlow: (flow: FlowNode[]) => void;
}> = ({ flow, onUpdateFlow }) => {
  const [draggedItem, setDraggedItem] = useState<{ type: 'palette' | 'flow'; data: any; index?: number } | null>(null);

  const addNode = (type: 'timer' | 'loop' | 'notification') => {
    const newNode: FlowNode = {
      id: Date.now().toString(),
      type,
      ...(type === 'timer' && { minutes: 25 }),
      ...(type === 'loop' && { loopCount: 2, children: [] }),
      ...(type === 'notification' && { notificationType: 'sound' as NotificationType })
    };
    onUpdateFlow([...flow, newNode]);
  };

  const updateNode = (index: number, updates: Partial<FlowNode>) => {
    const newFlow = [...flow];
    newFlow[index] = { ...newFlow[index], ...updates };
    onUpdateFlow(newFlow);
  };

  const deleteNode = (index: number) => {
    onUpdateFlow(flow.filter((_, i) => i !== index));
  };

  const moveNode = (fromIndex: number, toIndex: number) => {
    const newFlow = [...flow];
    const [movedNode] = newFlow.splice(fromIndex, 1);
    newFlow.splice(toIndex, 0, movedNode);
    onUpdateFlow(newFlow);
  };

  const handleDragStart = (e: React.DragEvent, type: 'palette' | 'flow', data: any, index?: number) => {
    setDraggedItem({ type, data, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === 'palette') {
      // パレットから追加
      const newNode: FlowNode = {
        id: Date.now().toString(),
        type: draggedItem.data,
        ...(draggedItem.data === 'timer' && { minutes: 25 }),
        ...(draggedItem.data === 'loop' && { loopCount: 2, children: [] }),
        ...(draggedItem.data === 'notification' && { notificationType: 'sound' as NotificationType })
      };
      
      if (targetIndex !== undefined) {
        const newFlow = [...flow];
        newFlow.splice(targetIndex, 0, newNode);
        onUpdateFlow(newFlow);
      } else {
        onUpdateFlow([...flow, newNode]);
      }
    } else if (draggedItem.type === 'flow' && draggedItem.index !== undefined && targetIndex !== undefined) {
      // フロー内での移動
      moveNode(draggedItem.index, targetIndex);
    }

    setDraggedItem(null);
  };

  return (
    <div className="space-y-4">
      {/* パレット */}
      <div className="bg-gray-700 p-3 rounded">
        <div className="text-sm text-gray-300 mb-2">要素をドラッグして追加</div>
        <div className="flex gap-2 flex-wrap">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'palette', 'timer')}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded cursor-move flex items-center gap-2 text-sm"
          >
            <Clock size={16} />
            タイマー
          </div>
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'palette', 'loop')}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded cursor-move flex items-center gap-2 text-sm"
          >
            <Repeat size={16} />
            ループ
          </div>
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'palette', 'notification')}
            className="bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded cursor-move flex items-center gap-2 text-sm"
          >
            <Bell size={16} />
            通知
          </div>
        </div>
      </div>

      {/* フロー */}
      <div 
        className="bg-gray-700 p-3 rounded min-h-[200px]"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e)}
      >
        <div className="text-sm text-gray-300 mb-2">フロー</div>
        {flow.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            要素をここにドラッグしてください
          </div>
        ) : (
          <div className="space-y-2">
            {flow.map((node, index) => (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, 'flow', node, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className="bg-gray-600 p-3 rounded cursor-move hover:bg-gray-500"
              >
                <FlowNodeEditor
                  node={node}
                  onUpdate={(updates) => updateNode(index, updates)}
                  onDelete={() => deleteNode(index)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// フローノードエディターコンポーネント
const FlowNodeEditor: React.FC<{
  node: FlowNode;
  onUpdate: (updates: Partial<FlowNode>) => void;
  onDelete: () => void;
}> = ({ node, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const addChildNode = (type: 'timer' | 'notification') => {
    const newChild: FlowNode = {
      id: Date.now().toString(),
      type,
      ...(type === 'timer' && { minutes: 25 }),
      ...(type === 'notification' && { notificationType: 'sound' as NotificationType })
    };
    const children = node.children || [];
    onUpdate({ children: [...children, newChild] });
  };

  const updateChildNode = (index: number, updates: Partial<FlowNode>) => {
    const children = [...(node.children || [])];
    children[index] = { ...children[index], ...updates };
    onUpdate({ children });
  };

  const deleteChildNode = (index: number) => {
    const children = node.children?.filter((_, i) => i !== index) || [];
    onUpdate({ children });
  };

  const moveChildNode = (fromIndex: number, toIndex: number) => {
    const children = [...(node.children || [])];
    const [movedNode] = children.splice(fromIndex, 1);
    children.splice(toIndex, 0, movedNode);
    onUpdate({ children });
  };

  if (node.type === 'timer') {
    return (
      <div className="flex items-center gap-3">
        <Clock size={20} className="text-blue-400" />
        <input
          type="number"
          value={node.minutes || 0}
          onChange={(e) => onUpdate({ minutes: parseInt(e.target.value) || 0 })}
          className="bg-gray-700 px-2 py-1 rounded w-20 text-center"
          min="1"
        />
        <span className="text-sm">分</span>
        <button
          onClick={onDelete}
          className="ml-auto bg-red-600 hover:bg-red-700 p-1 rounded"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  if (node.type === 'loop') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Repeat size={20} className="text-purple-400" />
          <input
            type="number"
            value={node.loopCount || 0}
            onChange={(e) => onUpdate({ loopCount: parseInt(e.target.value) || 0 })}
            className="bg-gray-700 px-2 py-1 rounded w-20 text-center"
            min="1"
          />
          <span className="text-sm">回繰り返す</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
          >
            {isExpanded ? '▼' : '▶'} 内容を{isExpanded ? '閉じる' : '編集'}
          </button>
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 p-1 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {isExpanded && (
          <div className="ml-8 mt-2 space-y-2 border-l-2 border-purple-400 pl-3">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => addChildNode('timer')}
                className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1"
              >
                <Clock size={14} />
                タイマー追加
              </button>
              <button
                onClick={() => addChildNode('notification')}
                className="bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded text-xs flex items-center gap-1"
              >
                <Bell size={14} />
                通知追加
              </button>
            </div>

            {node.children && node.children.length > 0 ? (
              <div className="space-y-2">
                {node.children.map((child, index) => (
                  <div
                    key={child.id}
                    className="bg-gray-700 p-2 rounded"
                  >
                    <ChildNodeEditor
                      node={child}
                      onUpdate={(updates) => updateChildNode(index, updates)}
                      onDelete={() => deleteChildNode(index)}
                      onMoveUp={index > 0 ? () => moveChildNode(index, index - 1) : undefined}
                      onMoveDown={index < (node.children?.length || 0) - 1 ? () => moveChildNode(index, index + 1) : undefined}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm py-2">
                タイマーまたは通知を追加してください
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'notification') {
    return (
      <div className="flex items-center gap-3">
        {node.notificationType === 'none' ? (
          <BellOff size={20} className="text-orange-400" />
        ) : (
          <Bell size={20} className="text-orange-400" />
        )}
        <select
          value={node.notificationType || 'sound'}
          onChange={(e) => onUpdate({ notificationType: e.target.value as NotificationType })}
          className="bg-gray-700 px-2 py-1 rounded flex-1"
        >
          <option value="sound">音で通知</option>
          <option value="alert">アラート</option>
          <option value="none">通知なし</option>
        </select>
        <button
          onClick={onDelete}
          className="bg-red-600 hover:bg-red-700 p-1 rounded"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return null;
};

// 子ノードエディターコンポーネント
const ChildNodeEditor: React.FC<{
  node: FlowNode;
  onUpdate: (updates: Partial<FlowNode>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}> = ({ node, onUpdate, onDelete, onMoveUp, onMoveDown }) => {
  if (node.type === 'timer') {
    return (
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-blue-400" />
        <input
          type="number"
          value={node.minutes || 0}
          onChange={(e) => onUpdate({ minutes: parseInt(e.target.value) || 0 })}
          className="bg-gray-600 px-2 py-1 rounded w-16 text-center text-sm"
          min="1"
        />
        <span className="text-xs">分</span>
        <div className="ml-auto flex gap-1">
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              className="bg-gray-600 hover:bg-gray-500 p-1 rounded text-xs"
              title="上に移動"
            >
              ▲
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              className="bg-gray-600 hover:bg-gray-500 p-1 rounded text-xs"
              title="下に移動"
            >
              ▼
            </button>
          )}
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 p-1 rounded"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  if (node.type === 'notification') {
    return (
      <div className="flex items-center gap-2">
        {node.notificationType === 'none' ? (
          <BellOff size={16} className="text-orange-400" />
        ) : (
          <Bell size={16} className="text-orange-400" />
        )}
        <select
          value={node.notificationType || 'sound'}
          onChange={(e) => onUpdate({ notificationType: e.target.value as NotificationType })}
          className="bg-gray-600 px-2 py-1 rounded flex-1 text-sm"
        >
          <option value="sound">音</option>
          <option value="alert">アラート</option>
          <option value="none">なし</option>
        </select>
        <div className="flex gap-1">
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              className="bg-gray-600 hover:bg-gray-500 p-1 rounded text-xs"
              title="上に移動"
            >
              ▲
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              className="bg-gray-600 hover:bg-gray-500 p-1 rounded text-xs"
              title="下に移動"
            >
              ▼
            </button>
          )}
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 p-1 rounded"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// タスクアイテムコンポーネント
const TaskItem: React.FC<{
  task: Task;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateName: (name: string) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  formatMinutes: (minutes: number) => string;
}> = ({ task, isSelected, isEditing, onSelect, onDelete, onUpdateName, onStartEdit, onEndEdit, formatMinutes }) => {
  const [editName, setEditName] = useState(task.name);

  useEffect(() => {
    setEditName(task.name);
  }, [task.name]);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdateName(editName);
    } else {
      setEditName(task.name);
    }
    onEndEdit();
  };

  return (
    <div
      className={`bg-gray-700 p-3 rounded cursor-pointer hover:bg-gray-600 transition-colors ${
        isSelected ? 'ring-2 ring-green-400' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-green-400' : 'bg-gray-500'}`}></div>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                } else if (e.key === 'Escape') {
                  setEditName(task.name);
                  onEndEdit();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-600 px-2 py-1 rounded flex-1"
              autoFocus
            />
          ) : (
            <span className="flex-1">{task.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-mono text-sm">
            {formatMinutes(task.totalMinutes)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            className="p-1 hover:bg-gray-800 rounded"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-600 rounded"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;