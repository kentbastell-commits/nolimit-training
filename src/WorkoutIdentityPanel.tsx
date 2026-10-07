import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Pencil, Plus, Tags } from 'lucide-react';
import type { ProgramExercise } from './appCore';
import ExerciseLabelControl from './ExerciseLabelControl';
import { LABEL_PALETTE, cleanLabelText, safeLabelColor } from './workoutPresentation';
import './WorkoutIdentityPanel.css';

export function LabelColours({ value, change, label }: { value: string; change: (v: string) => void; label: string }) {
  const zh = useTranslation().i18n.language.startsWith('zh');
  return <div className="labelColourChoices" role="group" aria-label={label}>
    <button type="button" className={!value ? 'selected' : ''} aria-pressed={!value} onClick={() => change('')}>{zh ? '自动' : 'Auto'}</button>
    {LABEL_PALETTE.map((hex, i) => <button type="button" key={hex} className="labelColourSwatch" style={{ background: hex }} aria-label={`${label} ${i + 1}`} aria-pressed={value === hex} onClick={() => change(hex)}>{value === hex && <Check size={15}/>}</button>)}
    <label className="labelColourCustom" title={zh ? '自选颜色' : 'Custom colour'}><input type="color" value={safeLabelColor(value) || LABEL_PALETTE[0]} aria-label={zh ? '自选颜色' : 'Custom colour'} onChange={e => change(e.target.value)}/><span>+</span></label>
  </div>;
}

type Props = { name: string; nameCn: string; setName: (v: string) => void; setNameCn: (v: string) => void;
  exercises: ProgramExercise[]; editExercise: (index: number, field: keyof ProgramExercise, value: string) => void;
  editBlock: (name: string, patch: { name?: string; nameCn?: string; color?: string }) => void; addBlock: (name: string, index: number) => void };
export default function WorkoutIdentityPanel(p: Props) {
  const zh = useTranslation().i18n.language.startsWith('zh');
  const [editing, setEditing] = useState(false), [labelsOpen, setLabelsOpen] = useState(false), [newBlock, setNewBlock] = useState(''), [startIndex, setStartIndex] = useState(0);
  const blocks = [...new Set(p.exercises.map(e => e.sectionName || 'Main'))];
  return <section className="workoutIdentityPanel" aria-label={zh ? '训练名称与标签' : 'Workout name and labels'}>
    <div className="workoutIdentityHeading"><div><span className="workoutIdentityEyebrow">{zh ? '本次训练' : 'THIS WORKOUT'}</span><h2>{(zh && p.nameCn) || p.name || (zh ? '未命名训练' : 'Untitled workout')}</h2></div><button type="button" className="identityEditButton" aria-expanded={editing} onClick={() => setEditing(!editing)}><Pencil size={15}/>{zh ? '修改名称' : 'Edit name'}</button></div>
    {editing && <div className="workoutIdentityFields"><label>{zh ? '训练名称（英文）' : 'Workout name'}<input autoFocus maxLength={120} value={p.name} onChange={e => {p.setName(e.target.value);p.setNameCn('');}}/></label><label>{zh ? '训练名称（中文）' : 'Chinese name'}<input maxLength={120} value={p.nameCn || ''} onChange={e => p.setNameCn(e.target.value)}/></label><p>{zh ? '名称会随本次训练一同保存。' : 'Saved with this workout.'}</p></div>}
    <div className="workoutIdentityBottom"><div className="workoutBlockTrail">{blocks.map(name => {const first = p.exercises.find(e => (e.sectionName || 'Main') === name)!;return <span key={name}><i style={{ background: safeLabelColor(first.sectionColor) || '#9b691a' }}/>{zh && first.sectionNameCn || name}</span>})}</div><button type="button" className="identityLabelsButton" aria-expanded={labelsOpen} onClick={() => setLabelsOpen(!labelsOpen)}><Tags size={16}/>{zh ? '标签与颜色' : 'Labels & colours'}<ChevronDown size={14}/></button></div>
    {labelsOpen && <div className="workoutLabelStudio">
      <div className="workoutLabelIntro"><h3>{zh ? '让训练一目了然' : 'Give the session a clear shape'}</h3><p>{zh ? '板块名称说明训练内容，编号说明顺序。每个动作还可添加独立标签与颜色。' : 'Name each block, keep the exercise order clear, and add a short tag wherever it helps.'}</p></div>
      <div className="workoutLabelColumns"><div className="workoutBlockList"><h4>{zh ? '训练板块' : 'Workout blocks'}</h4>{blocks.map(name => {
        const firstIndex = p.exercises.findIndex(e => (e.sectionName || 'Main') === name), first = p.exercises[firstIndex];
        return <div className="workoutBlockEditor" key={firstIndex} style={{ borderLeftColor: safeLabelColor(first.sectionColor) || '#9b691a' }}>
          <span className="workoutBlockCount">{p.exercises.filter(e => (e.sectionName || 'Main') === name).length} {zh ? '个动作' : p.exercises.filter(e => (e.sectionName || 'Main') === name).length === 1 ? 'exercise' : 'exercises'}</span>
          <label>{zh ? '板块名称' : 'Block name'}<input aria-label={`${zh ? '板块名称' : 'Block name'} ${firstIndex + 1}`} defaultValue={name} key={name} maxLength={40} onBlur={e => {if(cleanLabelText(e.target.value))p.editBlock(name,{name:e.target.value});else e.target.value=name;}} onKeyDown={e => {if(e.key==='Enter')e.currentTarget.blur();}}/></label>
          <label>{zh ? '中文名称' : 'Chinese block name'}<input value={first.sectionNameCn || ''} maxLength={40} onChange={e => p.editBlock(name,{nameCn:e.target.value})}/></label>
          <LabelColours value={first.sectionColor || ''} change={color => p.editBlock(name,{color})} label={`${name} ${zh ? '颜色' : 'colour'}`}/>
        </div>;
      })}<form className="workoutNewBlock" onSubmit={e => {e.preventDefault();if(cleanLabelText(newBlock)&&p.exercises.length){p.addBlock(cleanLabelText(newBlock),Math.min(startIndex,p.exercises.length-1));setNewBlock('');}}}><label>{zh ? '新增板块标签' : 'Add a block label'}<input value={newBlock} onChange={e => setNewBlock(e.target.value)} maxLength={40} placeholder={zh ? '例如：肩部控制' : 'e.g. Shoulder control'}/></label><label>{zh ? '选择第一个动作' : 'Assign an exercise'}<select value={startIndex} onChange={e => setStartIndex(Number(e.target.value))}>{p.exercises.map((e,i)=><option key={i} value={i}>{e.exerciseLabel} {e.exerciseName}</option>)}</select></label><button type="submit" disabled={!newBlock.trim()||!p.exercises.length}><Plus size={15}/>{zh ? '添加板块' : 'Add block'}</button></form></div>
      <div className="workoutTagList"><h4>{zh ? '动作标签' : 'Exercise labels'}</h4>{p.exercises.map((e,i)=><details className="workoutTagEditor" key={`${e.exerciseId}-${i}`}><summary><span className="labelStudioCode" style={{borderColor:safeLabelColor(e.labelColor || e.sectionColor)||'#9b691a'}}>{e.exerciseLabel || i+1}</span><span><strong>{e.exerciseName}</strong><small>{(zh && e.exerciseTagCn) || e.exerciseTag || (zh ? '添加标签或调整编号' : 'Add a tag or adjust the code')}</small></span><Pencil size={14}/></summary><div className="workoutTagFields"><label>{zh ? '所属板块' : 'Block'}<select value={e.sectionName || 'Main'} onChange={ev=>p.editExercise(i,'sectionName',ev.target.value)}>{blocks.map(b=><option key={b}>{b}</option>)}</select></label><ExerciseLabelControl exercise={e} index={i} change={v=>p.editExercise(i,'exerciseLabel',v)}/><label>{zh ? '动作标签' : 'Exercise tag'}<input value={e.exerciseTag || ''} maxLength={40} onChange={ev=>p.editExercise(i,'exerciseTag',ev.target.value)} placeholder={zh ? '例如：控制离心' : 'e.g. Slow lowering'}/></label><label>{zh ? '中文动作标签' : 'Chinese exercise tag'}<input value={e.exerciseTagCn || ''} maxLength={40} onChange={ev=>p.editExercise(i,'exerciseTagCn',ev.target.value)}/></label><LabelColours value={e.labelColor || ''} change={v=>p.editExercise(i,'labelColor',v)} label={`${e.exerciseName} ${zh ? '颜色' : 'colour'}`}/><small>{zh ? '自动颜色跟随所属板块。' : 'Auto colour follows the block.'}</small></div></details>)}</div></div>
    </div>}
  </section>;
}
