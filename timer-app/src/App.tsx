import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, Edit2, Clock, Bell, BellOff, Check, X, Timer, Repeat as Loop, ChevronUp, ChevronDown } from 'lucide-react';
import styles from './App.module.css';
import flowStyles from './FlowEditor.module.css';
import taskStyles from './TaskItem.module.css';

// Type definitions
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
  totalSeconds: number;
};

type TimerState = 'idle' | 'running' | 'paused';

// Storage keys
const STORAGE_KEYS = {
  TIMERS: 'timerPresets',
  TASKS: 'tasks',
};

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

  const handleTimerComplete = useCallback(() => {
    if (selectedTaskId && totalSeconds > 0) {
      const elapsedSeconds = totalSeconds;
      setTasks(prev => prev.map(task => 
        task.id === selectedTaskId 
          ? { ...task, totalSeconds: (task.totalSeconds || 0) + Math.round(elapsedSeconds) }
          : task
      ));
    }

    if (Notification.permission === 'granted') {
      new Notification('Timer Finished', { body: 'The timer has completed!', icon: '⏰' });
    }
    
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGK27OihUBALTqfj8bllHQc2jtTxy3kuBSh+zPDdkj0KE1iy6duqVxQLRJne8r1sIQUrgs/z2Yk1CBdftOrpollDCk6n5fK6aR0HNozU8sp5LgUqftDw3ZI7ChJYsunaqVYVDEOY3vK8bCAFK4PP8tmINQgXXbTo6aNYEQtNp+Xxu2oeByuAzvHZiTUIGGS47+mjURUMT6jl8rxsHwUnfM3v3I9ACxZat+rqpVcVDEKV3O+7bCEGLYXR89mJMwgXYLbr6aFaEwxOqOXyu2odBjKFzu/biTQIGGq+8OmnURUMTqfl8rxsHgcofc7w3pBAChZas+naqVYVDEOY3vK8bCAFK4LP8tiIOQgYYrjs6qJZEQtNp+Xzu2oeByuBzvHZiTUIGGO4+OijUhUMT6jl8btqHQcrhM/v14k1CBllvO/op1EVDUyn5fG7ax4HKn7P8N2SPAoSWLLp26lXFQxDmN7yvGwgBSuCz/PYiDUIGGK47Oqhkg==');
    audio.play().catch(() => {});

    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setCurrentSeconds(0);
    setTotalSeconds(0);
  }, [selectedTaskId, totalSeconds]);

  useEffect(() => {
    const savedTimers = localStorage.getItem(STORAGE_KEYS.TIMERS);
    const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    
    if (savedTimers) setTimerPresets(JSON.parse(savedTimers));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  useEffect(() => {
    if (timerPresets.length > 0) localStorage.setItem(STORAGE_KEYS.TIMERS, JSON.stringify(timerPresets));
  }, [timerPresets]);

  useEffect(() => {
    if (tasks.length > 0) localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (timerState === 'running' && currentSeconds <= 0) {
      handleTimerComplete();
    }
  }, [currentSeconds, timerState, handleTimerComplete]);

  const startTimer = () => {
    if (timerState === 'running' || !selectedPresetId) return;

    if (timerState === 'idle') {
      const preset = timerPresets.find(p => p.id === selectedPresetId);
      if (!preset || preset.flow.length === 0) return;
      const total = calculateTotalSeconds(preset.flow);
      setTotalSeconds(total);
      setCurrentSeconds(total);
    }

    setTimerState('running');

    intervalRef.current = window.setInterval(() => {
      setCurrentSeconds(prev => prev - 1);
    }, 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('paused');
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    if (selectedTaskId && timerState !== 'idle') {
      const elapsedSeconds = totalSeconds - currentSeconds;
      if (elapsedSeconds > 0) {
        setTasks(prev => prev.map(task => 
          task.id === selectedTaskId 
            ? { ...task, totalSeconds: (task.totalSeconds || 0) + Math.round(elapsedSeconds) }
            : task
        ));
      }
    }
    
    setTimerState('idle');
    setCurrentSeconds(0);
    setTotalSeconds(0);
  };

  const resetTimer = () => {
    if (timerState === 'running') return;
    stopTimer();
  };

  const calculateTotalSeconds = (nodes: FlowNode[]): number => {
    return nodes.reduce((total, node) => {
      if (node.type === 'timer' && node.minutes) {
        return total + node.minutes * 60;
      }
      if (node.type === 'loop' && node.children && node.loopCount) {
        return total + calculateTotalSeconds(node.children) * node.loopCount;
      }
      return total;
    }, 0);
  };

  const addNewPreset = () => {
    const newPreset: TimerPreset = {
      id: Date.now().toString(),
      name: `Timer ${timerPresets.length + 1}`,
      flow: []
    };
    setTimerPresets([...timerPresets, newPreset]);
    setSelectedPresetId(newPreset.id);
  };

  const deletePreset = (id: string) => {
    setTimerPresets(prev => prev.filter(p => p.id !== id));
    if (selectedPresetId === id) setSelectedPresetId(null);
  };

  const updatePresetName = (id: string, name: string) => {
    setTimerPresets(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  const updatePresetFlow = (id: string, flow: FlowNode[]) => {
    setTimerPresets(prev => prev.map(p => p.id === id ? { ...p, flow } : p));
  };

  const addTask = () => {
    const newTask: Task = { id: Date.now().toString(), name: 'New Task', totalSeconds: 0 };
    setTasks([...tasks, newTask]);
    setEditingTaskId(newTask.id);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

  const updateTaskName = (id: string, name: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTaskTime = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00:00";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const selectedPreset = timerPresets.find(p => p.id === selectedPresetId);
  const progress = totalSeconds > 0 ? ((totalSeconds - currentSeconds) / totalSeconds) * 100 : 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Flow Timer</h1>
      
      <div className={styles.tabs}>
        <div className={`${styles.tab} ${activeTab === 'timer' ? styles.active : ''}`} onClick={() => setActiveTab('timer')}>Timer Setup</div>
        <div className={`${styles.tab} ${activeTab === 'running' ? styles.active : ''}`} onClick={() => setActiveTab('running')}>Timer</div>
        <div className={`${styles.tab} ${activeTab === 'tasks' ? styles.active : ''}`} onClick={() => setActiveTab('tasks')}>Tasks</div>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.card} ${activeTab === 'timer' ? styles.active : ''}`}>
          <h2 className={styles.cardHeader}>Timer Presets</h2>
          <select
            value={selectedPresetId || ''}
            onChange={(e) => setSelectedPresetId(e.target.value)}
            className={styles.select}
          >
            <option value="">Select a preset</option>
            {timerPresets.map(preset => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
          <button onClick={addNewPreset} className={`${styles.button} ${styles.primary}`} style={{ width: '100%', marginTop: '16px' }}>
            <Plus size={20} style={{ marginRight: '8px' }} />
            New Preset
          </button>
          {selectedPreset && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                {isEditingPresetName ? (
                  <>
                    <input
                      type="text"
                      value={editingPresetName}
                      onChange={(e) => setEditingPresetName(e.target.value)}
                      className={styles.textField}
                      autoFocus
                    />
                    <button onClick={() => { updatePresetName(selectedPreset.id, editingPresetName); setIsEditingPresetName(false); }} className={`${styles.button} ${styles.primary}`}><Check size={16} /></button>
                    <button onClick={() => setIsEditingPresetName(false)} className={`${styles.button} ${styles.secondary}`}><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <span style={{ flexGrow: 1, fontWeight: 600 }}>{selectedPreset.name}</span>
                    <button onClick={() => { setEditingPresetName(selectedPreset.name); setIsEditingPresetName(true); }} className={`${styles.button} ${styles.secondary}`}><Edit2 size={16} /></button>
                    <button onClick={() => deletePreset(selectedPreset.id)} className={`${styles.button} ${styles.error}`}><Trash2 size={16} /></button>
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

        <div className={`${styles.card} ${activeTab === 'running' ? styles.active : ''}`}>
          <h2 className={styles.cardHeader}>{selectedPreset ? selectedPreset.name : 'Timer'}</h2>
          <select
            value={selectedTaskId || ''}
            onChange={(e) => setSelectedTaskId(e.target.value || null)}
            className={styles.select}
          >
            <option value="">No Task</option>
            {tasks.map(task => (
              <option key={task.id} value={task.id}>
                {task.name} ({formatTaskTime(task.totalSeconds)})
              </option>
            ))}
          </select>
          <div className={styles.circularProgress}>
            <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%' }}>
              <circle className={styles.track} cx="60" cy="60" r="54" />
              <circle
                className={styles.progress}
                cx="60"
                cy="60"
                r="54"
                strokeDasharray={2 * Math.PI * 54}
                strokeDashoffset={2 * Math.PI * 54 * (1 - progress / 100)}
              />
            </svg>
            <div className={styles.time}>{formatTime(currentSeconds)}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            {timerState === 'idle' && (
              <button onClick={startTimer} disabled={!selectedPresetId || !selectedPreset?.flow.length} className={`${styles.button} ${styles.primary}`}><Play size={20} /> Start</button>
            )}
            {timerState === 'running' && (
              <button onClick={pauseTimer} className={`${styles.button} ${styles.primary}`}><Pause size={20} /> Pause</button>
            )}
            {timerState === 'paused' && (
              <button onClick={startTimer} className={`${styles.button} ${styles.primary}`}><Play size={20} /> Resume</button>
            )}
            <button onClick={resetTimer} disabled={timerState === 'running'} className={`${styles.button} ${styles.secondary}`}><RotateCcw size={20} /> Reset</button>
            {timerState !== 'idle' && (
              <button onClick={stopTimer} className={`${styles.button} ${styles.error}`}>Stop</button>
            )}
          </div>
        </div>

        <div className={`${styles.card} ${activeTab === 'tasks' ? styles.active : ''}`}>
          <h2 className={styles.cardHeader}>Tasks</h2>
          <button onClick={addTask} className={`${styles.button} ${styles.primary}`} style={{ width: '100%', marginBottom: '16px' }}>
            <Plus size={20} style={{ marginRight: '8px' }} />
            New Task
          </button>
          <div>
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
                formatTaskTime={formatTaskTime}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FlowEditor: React.FC<{
  flow: FlowNode[];
  onUpdateFlow: (flow: FlowNode[]) => void;
}> = ({ flow, onUpdateFlow }) => {
  type PaletteItemType = 'timer' | 'loop' | 'notification';
  const [draggedItem, setDraggedItem] = useState<{ type: 'palette' | 'flow'; data: PaletteItemType | FlowNode; index?: number } | null>(null);

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

  const handleDragStart = (e: React.DragEvent, type: 'palette' | 'flow', data: PaletteItemType | FlowNode, index?: number) => {
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

    if (draggedItem.type === 'palette' && typeof draggedItem.data === 'string') {
      const newNode: FlowNode = {
        id: Date.now().toString(),
        type: draggedItem.data,
        ...(draggedItem.data === 'timer' && { minutes: 25 }),
        ...(draggedItem.data === 'loop' && { loopCount: 2, children: [] }),
        ...(draggedItem.data === 'notification' && { notificationType: 'sound' as NotificationType })
      };
      
      const newFlow = [...flow];
      if (targetIndex !== undefined) {
        newFlow.splice(targetIndex, 0, newNode);
      } else {
        newFlow.push(newNode);
      }
      onUpdateFlow(newFlow);
    } else if (draggedItem.type === 'flow' && draggedItem.index !== undefined && targetIndex !== undefined) {
      moveNode(draggedItem.index, targetIndex);
    }

    setDraggedItem(null);
  };

  return (
    <div>
      <div className={flowStyles.palette}>
        <div className={flowStyles.paletteTitle}>Toolbox</div>
        <div className={flowStyles.paletteButtons}>
          <button draggable onDragStart={(e) => handleDragStart(e, 'palette', 'timer')} className={`${styles.button} ${styles.secondary}`}><Timer /> Timer</button>
          <button draggable onDragStart={(e) => handleDragStart(e, 'palette', 'loop')} className={`${styles.button} ${styles.secondary}`}><Loop /> Loop</button>
          <button draggable onDragStart={(e) => handleDragStart(e, 'palette', 'notification')} className={`${styles.button} ${styles.secondary}`}><Bell /> Notification</button>
        </div>
      </div>
      <div
        className={flowStyles.flowContainer}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e)}
      >
        <div className={flowStyles.flowTitle}>Flow</div>
        {flow.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8e8e93', paddingTop: '64px' }}>
            Drag elements here
          </div>
        ) : (
          <ul className={flowStyles.flowList}>
            {flow.map((node, index) => (
              <li
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, 'flow', node, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleDrop(e, index);
                }}
                className={flowStyles.flowItem}
              >
                <FlowNodeEditor
                  node={node}
                  onUpdate={(updates) => updateNode(index, updates)}
                  onDelete={() => deleteNode(index)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

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
    onUpdate({ children: [...(node.children || []), newChild] });
  };

  const updateChildNode = (index: number, updates: Partial<FlowNode>) => {
    const children = [...(node.children || [])];
    children[index] = { ...children[index], ...updates };
    onUpdate({ children });
  };

  const deleteChildNode = (index: number) => {
    onUpdate({ children: node.children?.filter((_, i) => i !== index) || [] });
  };
  
  const moveChildNode = (fromIndex: number, toIndex: number) => {
    const children = [...(node.children || [])];
    const [movedNode] = children.splice(fromIndex, 1);
    children.splice(toIndex, 0, movedNode);
    onUpdate({ children });
  };

  const renderNode = () => {
    switch (node.type) {
      case 'timer':
        return (
          <div className={flowStyles.nodeEditor}>
            <Clock />
            <input
              type="number"
              value={node.minutes || 0}
              onChange={(e) => onUpdate({ minutes: parseInt(e.target.value) || 0 })}
              className={styles.textField}
              style={{ width: '80px' }}
            />
            <span>minutes</span>
          </div>
        );
      case 'loop':
        return (
          <div className={flowStyles.loopNode}>
            <div className={flowStyles.loopHeader}>
              <Loop />
              <input
                type="number"
                value={node.loopCount || 0}
                onChange={(e) => onUpdate({ loopCount: parseInt(e.target.value) || 0 })}
                className={styles.textField}
                style={{ width: '80px' }}
              />
              <span>times</span>
              <button onClick={() => setIsExpanded(!isExpanded)} className={`${styles.button} ${styles.secondary} ${flowStyles.buttonSmall}`} style={{ marginLeft: 'auto' }}>
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {isExpanded && (
              <div className={flowStyles.loopChildren}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button onClick={() => addChildNode('timer')} className={`${styles.button} ${styles.secondary} ${flowStyles.buttonSmall}`}><Timer /> Add Timer</button>
                  <button onClick={() => addChildNode('notification')} className={`${styles.button} ${styles.secondary} ${flowStyles.buttonSmall}`}><Bell /> Add Notification</button>
                </div>
                <ul>
                  {node.children?.map((child, index) => (
                    <li key={child.id} style={{ marginBottom: '8px' }}>
                      <ChildNodeEditor
                        node={child}
                        onUpdate={(updates) => updateChildNode(index, updates)}
                        onDelete={() => deleteChildNode(index)}
                        onMoveUp={index > 0 ? () => moveChildNode(index, index - 1) : undefined}
                        onMoveDown={index < (node.children?.length || 0) - 1 ? () => moveChildNode(index, index + 1) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'notification':
        return (
          <div className={flowStyles.nodeEditor}>
            {node.notificationType === 'none' ? <BellOff /> : <Bell />}
            <select
              value={node.notificationType || 'sound'}
              onChange={(e) => onUpdate({ notificationType: e.target.value as NotificationType })}
              className={styles.select}
            >
              <option value="sound">Sound</option>
              <option value="alert">Alert</option>
              <option value="none">None</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={flowStyles.nodeEditor}>
      {renderNode()}
      <button onClick={onDelete} className={`${styles.button} ${styles.error} ${flowStyles.buttonSmall}`} style={{ marginLeft: 'auto' }}><Trash2 /></button>
    </div>
  );
};

const ChildNodeEditor: React.FC<{
  node: FlowNode;
  onUpdate: (updates: Partial<FlowNode>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}> = ({ node, onUpdate, onDelete, onMoveUp, onMoveDown }) => {
  const renderNode = () => {
    switch (node.type) {
      case 'timer':
        return (
          <>
            <Clock />
            <input
              type="number"
              value={node.minutes || 0}
              onChange={(e) => onUpdate({ minutes: parseInt(e.target.value) || 0 })}
              className={styles.textField}
              style={{ width: '70px' }}
            />
            <span>min</span>
          </>
        );
      case 'notification':
        return (
          <>
            {node.notificationType === 'none' ? <BellOff /> : <Bell />}
            <select
              value={node.notificationType || 'sound'}
              onChange={(e) => onUpdate({ notificationType: e.target.value as NotificationType })}
              className={styles.select}
            >
              <option value="sound">Sound</option>
              <option value="alert">Alert</option>
              <option value="none">None</option>
            </select>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={flowStyles.childNodeEditor}>
      {renderNode()}
      <div className={flowStyles.childNodeActions}>
        {onMoveUp && <button onClick={onMoveUp} className={`${styles.button} ${styles.secondary} ${flowStyles.buttonSmall}`}><ChevronUp size={16} /></button>}
        {onMoveDown && <button onClick={onMoveDown} className={`${styles.button} ${styles.secondary} ${flowStyles.buttonSmall}`}><ChevronDown size={16} /></button>}
      </div>
      <button onClick={onDelete} className={`${styles.button} ${styles.error} ${flowStyles.buttonSmall}`}><Trash2 /></button>
    </div>
  );
};

const TaskItem: React.FC<{
  task: Task;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateName: (name: string) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  formatTaskTime: (totalSeconds: number) => string;
}> = ({ task, isSelected, isEditing, onSelect, onDelete, onUpdateName, onStartEdit, onEndEdit, formatTaskTime }) => {
  const [editName, setEditName] = useState(task.name);

  useEffect(() => {
    setEditName(task.name);
  }, [task.name]);

  const handleSave = () => {
    if (editName.trim()) onUpdateName(editName);
    else setEditName(task.name);
    onEndEdit();
  };

  return (
    <div className={`${taskStyles.taskItem} ${isSelected ? taskStyles.selected : ''}`} onClick={onSelect}>
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setEditName(task.name); onEndEdit(); }
          }}
          onClick={(e) => e.stopPropagation()}
          className={styles.textField}
          autoFocus
        />
      ) : (
        <>
          <span className={taskStyles.taskName}>{task.name}</span>
          <span className={taskStyles.taskTime}>{formatTaskTime(task.totalSeconds)}</span>
          <div className={taskStyles.actions}>
            <button onClick={(e) => { e.stopPropagation(); onStartEdit(); }} className={`${styles.button} ${styles.secondary} ${flowStyles.buttonSmall}`}><Edit2 size={16} /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`${styles.button} ${styles.error} ${flowStyles.buttonSmall}`}><Trash2 size={16} /></button>
          </div>
        </>
      )}
    </div>
  );
};

export default App;