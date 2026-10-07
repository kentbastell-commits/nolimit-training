// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseExerciseNotes, type ProgramExercise } from '../../../src/appCore';
import { editWorkoutBlock, presentationMetadata, labelInk, safeLabelColor, tagInk } from '../../../src/workoutPresentation';
import { humanTranslationText } from '../../../server/db/contentTranslations';
import { stripLocalizedExerciseMeta } from '../../../server/db/templateMeta';

describe('workout presentation', () => {
  it('round trips bilingual tags without leaking styling into coaching prose or translation', () => {
    const input = {sectionNameCn:'肩部控制',exerciseTag:'8 of each letter',exerciseTagCn:'每个字母8次',labelColor:'#80528c'};
    const notes=[...presentationMetadata(input),'Setup\nLie face down.'].join('\n\n');
    expect(parseExerciseNotes(notes)).toMatchObject({...input,coachingNotes:'Setup\nLie face down.'});
    expect(humanTranslationText(notes,'notes')).toBe('Setup\nLie face down.');
    expect(stripLocalizedExerciseMeta(notes)).toBe('Setup\nLie face down.');
    expect(parseExerciseNotes(presentationMetadata({exerciseTag:'Test\nCircuit: Hidden'}).join('\n')).groupName).toBe('');
  });
  it('renames and recolours a whole block without changing the circuit, prescriptions or custom exercise colour', () => {
    const a={exerciseId:'a',sectionName:'Core',sectionColor:'#111111',exerciseLabel:'Z1',isLabelCustom:true,groupType:'Circuit',groupName:'G',sets:'2',rest:'120 sec',labelColor:'#80528c',setPrescriptions:[{setNumber:1,time:'30'}]} as ProgramExercise;
    const b={...a,exerciseId:'b',isLabelCustom:false};
    const other={...b,exerciseId:'c',sectionName:'Strength'};
    const next=editWorkoutBlock([a,b,other],'Core',{name:'Trunk control',nameCn:'核心控制',color:'#307563'});
    expect(next[0]).toMatchObject({...a,sectionName:'Trunk control',sectionNameCn:'核心控制',sectionColor:'#307563'});
    expect(next[1]).toMatchObject({sectionName:'Trunk control',exerciseLabel:'A2',groupType:'Circuit',groupName:'G',setPrescriptions:a.setPrescriptions});
    expect(next[2].sectionName).toBe('Strength');expect(a.sectionName).toBe('Core');
    expect(editWorkoutBlock(next,'Trunk control',{color:''})[0].sectionColor).toBe('');
  });
  it('validates colours and keeps code text readable on light and dark choices', () => {
    expect(safeLabelColor('red;display:none')).toBe('');expect(safeLabelColor('#eacaca')).toBe('#eacaca');
    expect(labelInk('#ffffff')).toBe('#161715');expect(labelInk('#000000')).toBe('#ffffff');
    expect(tagInk('#ffffff')).toBe('#3a3d34');expect(tagInk('#80528c')).toBe('#80528c');
  });
});
