'use client';

import { useState, useEffect } from 'react';
import { StorageAdapter } from '@/lib/storage';

const PROJECT_LIST_KEY = 'project_list';
const DEFAULT_PROJECT = '代码助手';

export function useProjects() {
  const [currentProject, setCurrentProject] = useState<string>(DEFAULT_PROJECT);
  const [projectList, setProjectList] = useState<string[]>([DEFAULT_PROJECT]);
  const [loaded, setLoaded] = useState(false);
  const [pinnedProject, setPinnedProject] = useState<string>('');

  // 设置置顶项目
  const pinProject = async (name: string) => {
    setPinnedProject(name);
    setCurrentProject(name);
    await StorageAdapter.set('pinned_project', name);
  };

  // 取消置顶
  const unpinProject = async () => {
    setPinnedProject('');
    await StorageAdapter.remove('pinned_project');
  };

  // 初始化：优先使用置顶项目
  useEffect(() => {
    async function load() {
      const saved = await StorageAdapter.get<string[]>(PROJECT_LIST_KEY);
      const pinned = await StorageAdapter.get<string>('pinned_project');
      
      if (saved && saved.length > 0) {
        setProjectList(saved);
        // 如果有置顶项目且存在于列表中，就用它；否则用第一个
        if (pinned && saved.includes(pinned)) {
          setCurrentProject(pinned);
          setPinnedProject(pinned);
        } else {
          setCurrentProject(saved[0]);
        }
      }
      setLoaded(true);
    }
    load();
  }, []);

  // 保存项目列表
  useEffect(() => {
    if (loaded) {
      StorageAdapter.set(PROJECT_LIST_KEY, projectList);
    }
  }, [projectList, loaded]);

  // 切换项目
  const switchProject = (name: string) => {
    if (projectList.includes(name)) {
      setCurrentProject(name);
    }
  };

  // 新建项目
  const addProject = (name: string) => {
    if (!name.trim() || projectList.includes(name.trim())) return;
    setProjectList(prev => [...prev, name.trim()]);
    setCurrentProject(name.trim());
  };

  // 删除项目
  const deleteProject = (name: string) => {
    if (projectList.length <= 1) return;
    const updated = projectList.filter(p => p !== name);
    setProjectList(updated);
    if (currentProject === name) {
      setCurrentProject(updated[0]);
    }
  };

  return {
    currentProject,
    projectList,
    loaded,
    pinnedProject,
    switchProject,
    addProject,
    deleteProject,
    pinProject,
    unpinProject,
  };
}