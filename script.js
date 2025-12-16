class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentEditId = null;
        this.taskToDelete = null;
        this.statusToDelete = null;
        this.filters = {
            priorities: [],
            subject: '',
            sortBy: 'date'
        };
        this.viewMode = 'column';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateViewModeUI();
        this.renderTasks();
        this.updateTaskCounts();
    }

    loadTasks() {
        return JSON.parse(localStorage.getItem('tasks')) || [];
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    getTomorrowDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    generateId() {
        return Date.now();
    }

    setupEventListeners() {
        document.getElementById('addTaskBtn').onclick = () => this.openModal();
        document.getElementById('closeModal').onclick = () => this.closeModal();

        document.getElementById('cancelBtn').onclick = () => this.closeModal();
        document.getElementById('taskForm').onsubmit = (e) => {
            e.preventDefault();
            this.saveTask();
        }

        document.getElementById('filterBtn').onclick = () => this.openFilterModal();
        document.getElementById('sortBtn').onclick = () => this.openFilterModal();

        document.getElementById('closeFilterModal').onclick = () => this.closeFilterModal();

        document.getElementById('applyFilters').onclick = () => this.applyFilters();
        document.getElementById('clearFilters').onclick = () => this.clearFilters();
        document.getElementById('searchInput').addEventListener('input', (e) => { this.searchTasks(e.target.value); });

        document.getElementById('previewBtn').onclick = () => this.toggleViewMode();

        const taskModalElement = document.getElementById('taskModal');
        const filterModalElement = document.getElementById('filterModal');

        if (taskModalElement && typeof bootstrap !== 'undefined') {
            this.taskModal = new bootstrap.Modal(taskModalElement);
        }

        if (filterModalElement && typeof bootstrap !== 'undefined') {
            this.filterModal = new bootstrap.Modal(filterModalElement);
        }

        const confirmModalElement = document.getElementById('confirmModal');
        if (confirmModalElement && typeof bootstrap !== 'undefined') {
            this.confirmModal = new bootstrap.Modal(confirmModalElement);
        }

        const previewModalElement = document.getElementById('previewModal');
        if (previewModalElement && typeof bootstrap !== 'undefined') {
            this.previewModal = new bootstrap.Modal(previewModalElement);
        }

        document.getElementById('closeConfirmModal').onclick = () => this.closeConfirmModal();
        document.getElementById('cancelConfirmBtn').onclick = () => this.closeConfirmModal();
        document.getElementById('confirmDeleteBtn').onclick = () => this.confirmDelete();

        document.getElementById('closePreviewModal').onclick = () => this.closePreviewModal();
        document.getElementById('closePreviewModalBtn').onclick = () => this.closePreviewModal();

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.task-card-menu-container')) {
                document.querySelectorAll('.task-card-dropdown').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
            if (!e.target.closest('.column-header-menu-container')) {
                document.querySelectorAll('.column-header-dropdown').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });

        document.querySelectorAll('.column-header-menu').forEach(menuIcon => {
            menuIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                const status = menuIcon.getAttribute('data-column-status');
                this.toggleColumnMenu(status);
            });
        });

        document.querySelectorAll('.toggle-column-tasks').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const status = btn.getAttribute('data-column-status');
                this.toggleColumnTasksByStatus(status);
                this.toggleColumnMenu(status);
            });
        });

        document.querySelectorAll('.column-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.column-header-menu-container')) {
                    return;
                }
                const column = header.closest('.task-column');
                if (!column) return;
                const list = column.querySelector('.task-list');
                if (!list) return;
                const isHidden = list.style.display === 'none';
                list.style.display = isHidden ? '' : 'none';
            });
        });
    }

    toggleColumnTasksByStatus(status) {
        const menuIcon = document.querySelector(`.column-header-menu[data-column-status="${status}"]`);
        if (!menuIcon) return;

        const column = menuIcon.closest('.task-column');
        if (!column) return;

        const list = column.querySelector('.task-list');
        if (!list) return;

        const toggleBtn = document.querySelector(`.toggle-column-tasks[data-column-status="${status}"]`);

        const isHidden = list.classList.toggle('is-hidden');
        list.style.display = isHidden ? 'none' : '';

        if (toggleBtn) {
            toggleBtn.innerHTML = `
                <i class="fas ${isHidden ? 'fa-eye' : 'fa-eye-slash'}"></i> ${isHidden ? 'Mostrar Tareas' : 'Ocultar Tareas'}
            `;
        }
    }

    openModal(task = null) {
        const form = document.getElementById('taskForm');
        const modalTitle = document.getElementById('modalTitle');

        if (task) {
            modalTitle.textContent = 'Editar Tarea';
            this.currentEditId = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskDate').value = task.date;
            document.getElementById('taskTime').value = task.time || '';
            document.getElementById('taskSubject').value = task.subject;
            document.getElementById('taskPriority').value = task.priority;
        } else {
            modalTitle.textContent = 'Agregar Nueva Tarea';
            this.currentEditId = null;
            form.reset();
        }

        if (this.taskModal) {
            this.taskModal.show();
        }
    }

    closeModal() {
        if (this.taskModal) {
            this.taskModal.hide();
        }
        this.currentEditId = null;
        document.getElementById('taskForm').reset();
    }

    saveTask() {
        const formData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            date: document.getElementById('taskDate').value,
            time: document.getElementById('taskTime').value,
            subject: document.getElementById('taskSubject').value,
            priority: document.getElementById('taskPriority').value
        };

        const taskDate = new Date(formData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        taskDate.setHours(0, 0, 0, 0);
        const status = taskDate < today ? 'overdue' : 'in-progress';

        if (this.currentEditId) {
            const index = this.tasks.findIndex(t => t.id === this.currentEditId);
            if (index !== -1) {
                this.tasks[index] = { ...this.tasks[index], ...formData, status };
            }
        } else {
            const newTask = {
                id: this.generateId(),
                ...formData,
                status,
                createdAt: new Date().toISOString()
            };
            this.tasks.push(newTask);
        }

        this.saveTasks();
        this.renderTasks();
        this.updateTaskCounts();
        this.closeModal();
    }

    deleteTask(id) {
        this.taskToDelete = id;
        this.statusToDelete = null;

        const messageElement = document.getElementById('confirmDeleteMessage');
        if (messageElement) {
            messageElement.textContent = '¿Estás seguro de que deseas eliminar esta tarea?';
        }

        if (this.confirmModal) {
            this.confirmModal.show();
        }
    }

    confirmDelete() {
        if (this.taskToDelete !== null) {

            this.tasks = this.tasks.filter(t => t.id !== this.taskToDelete);
            this.taskToDelete = null;
        } else if (this.statusToDelete !== null) {
            this.tasks = this.tasks.filter(t => t.status !== this.statusToDelete);
            this.statusToDelete = null;
        }

        this.saveTasks();
        this.renderTasks();
        this.updateTaskCounts();
        this.closeConfirmModal();
    }

    closeConfirmModal() {
        if (this.confirmModal) {
            this.confirmModal.hide();
        }
        this.taskToDelete = null;
        this.statusToDelete = null;
    }

    renderTasks() {
        let filteredTasks = [...this.tasks];

        if (this.filters.priorities.length > 0) {
            filteredTasks = filteredTasks.filter(task =>
                this.filters.priorities.includes(task.priority)
            );
        }

        if (this.filters.subject) {
            filteredTasks = filteredTasks.filter(task =>
                task.subject.toLowerCase().includes(this.filters.subject.toLowerCase())
            );
        }

        filteredTasks.sort((a, b) => {
            switch (this.filters.sortBy) {
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'date':
                default:
                    return new Date(a.date) - new Date(b.date);
            }
        });

        if (this.viewMode === 'grid') {
            this.renderGridView(filteredTasks);
        } else {
            const inProgress = filteredTasks.filter(t => t.status === 'in-progress');
            const completed = filteredTasks.filter(t => t.status === 'completed');
            const overdue = filteredTasks.filter(t => t.status === 'overdue');

            this.renderTaskList('inProgressList', inProgress);
            this.renderTaskList('completedList', completed);
            this.renderTaskList('overdueList', overdue);
        }
    }

    renderTaskList(listId, tasks) {
        const listElement = document.getElementById(listId);
        listElement.innerHTML = '';

        if (tasks.length === 0) {
            listElement.innerHTML = '<p style="text-align: center; color: #7F8C8D; padding: 20px;">No hay tareas</p>';
            return;
        }

        tasks.forEach(task => {
            const taskCard = this.createTaskCard(task);
            listElement.appendChild(taskCard);
            this.attachMenuListeners(taskCard, task.id);
        });
    }

    attachMenuListeners(card, taskId) {
        const menuIcon = card.querySelector('.task-card-menu');
        const dropdown = card.querySelector('.task-card-dropdown');
        const completeBtn = card.querySelector('.complete-task');
        const deleteBtn = card.querySelector('.delete-task');
        const moveToInProgressBtn = card.querySelector('.move-to-in-progress-task');

        if (menuIcon && dropdown) {
            menuIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTaskMenu(taskId);
            });
        }

        if (completeBtn) {
            completeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.completeTask(taskId);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTask(taskId);
            });
        }

        if (moveToInProgressBtn) {
            moveToInProgressBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveTaskToInProgress(taskId);
            });
        }
    }

    toggleTaskMenu(taskId) {
        document.querySelectorAll('.task-card-dropdown').forEach(menu => {
            if (menu.id !== `menu-${taskId}`) {
                menu.style.display = 'none';
            }
        });

        const menu = document.getElementById(`menu-${taskId}`);
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }

    completeTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.status = 'completed';
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCounts();
            const menu = document.getElementById(`menu-${id}`);
            if (menu) menu.style.display = 'none';
        }
    }

    moveTaskToInProgress(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            if (this.isTaskDateOverdue(task)) {
                task.status = 'overdue';
            } else {
                task.status = 'in-progress';
            }
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCounts();
            const menu = document.getElementById(`menu-${id}`);
            if (menu) menu.style.display = 'none';
        }
    }

    toggleColumnMenu(status) {
        document.querySelectorAll('.column-header-dropdown').forEach(menu => {
            if (menu.id !== `column-menu-${status}`) {
                menu.style.display = 'none';
            }
        });

        const menu = document.getElementById(`column-menu-${status}`);
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }

    isTaskOverdue(task) {
        if (task.status === 'completed') return false;
        return this.isTaskDateOverdue(task);
    }

    isTaskDateOverdue(task) {
        const taskDate = new Date(task.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate < today;
    }

    completeAllTasks(status) {
        const tasksToComplete = this.tasks.filter(t => t.status === status);
        if (tasksToComplete.length === 0) {
            this.showNoTasksMessage('No hay tareas disponibles para completar');
            this.closeColumnMenu(status);
            return;
        }

        tasksToComplete.forEach(task => {
            task.status = 'completed';
        });

        this.saveTasks();
        this.renderTasks();
        this.updateTaskCounts();
        this.closeColumnMenu(status);
    }

    deleteAllTasks(status) {
        const tasksToDelete = this.tasks.filter(t => t.status === status);
        if (tasksToDelete.length === 0) {
            this.showNoTasksMessage('No hay tareas disponibles para eliminar');
            this.closeColumnMenu(status);
            return;
        }

        this.statusToDelete = status;
        this.taskToDelete = null;

        const messageElement = document.getElementById('confirmDeleteMessage');
        if (messageElement) {
            messageElement.textContent = `¿Estás seguro de que deseas eliminar todas las tareas ${this.getStatusLabel(status)}?`;
        }

        if (this.confirmModal) {
            this.confirmModal.show();
        }
        this.closeColumnMenu(status);
    }

    moveAllTasksToStatus(fromStatus, toStatus) {
        const tasksToMove = this.tasks.filter(t => t.status === fromStatus);
        if (tasksToMove.length === 0) {
            const actionLabel = toStatus === 'completed' ? 'mover a completadas' :
                toStatus === 'in-progress' ? 'mover a en progreso' : 'mover';
            this.showNoTasksMessage(`No hay tareas disponibles para ${actionLabel}`);
            this.closeColumnMenu(fromStatus);
            return;
        }

        tasksToMove.forEach(task => {
            if (toStatus === 'in-progress') {
                if (this.isTaskDateOverdue(task)) {
                    task.status = 'overdue';
                } else {
                    task.status = 'in-progress';
                }
            } else if (toStatus === 'completed') {
                task.status = 'completed';
            } else {
                task.status = toStatus;
            }
        });

        this.saveTasks();
        this.renderTasks();
        this.updateTaskCounts();
        this.closeColumnMenu(fromStatus);
    }

    closeColumnMenu(status) {
        const menu = document.getElementById(`column-menu-${status}`);
        if (menu) menu.style.display = 'none';
    }

    getStatusLabel(status) {
        const labels = {
            'in-progress': 'en progreso',
            'completed': 'completadas',
            'overdue': 'atrasadas'
        };
        return labels[status] || status;
    }

    showNoTasksMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'no-tasks-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;

        const dateObj = new Date(task.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateObj.setHours(0, 0, 0, 0);

        let dateDisplay = '';
        let timeDisplay = '';

        if (task.time) {
            timeDisplay = this.formatTime(task.time);
        } else {
            if (dateObj.getTime() === today.getTime()) {
                dateDisplay = 'Today';
            } else if (dateObj.getTime() === today.getTime() + 86400000) {
                dateDisplay = 'Tomorrow';
            } else {
                dateDisplay = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
            }
        }

        const categoryClass = task.subject.toLowerCase().includes('ux') || task.subject.toLowerCase().includes('design') ? 'category-ux' : 'category-dev';
        const isDescriptionLong = task.description.length > 100;
        const normalizedStatus = (task.status || '').toString().trim().toLowerCase().replace(/\s+/g, '-');
        const isInProgress = normalizedStatus === 'in-progress';
        const isCompleted = normalizedStatus === 'completed';

        card.innerHTML = `
            <div class="task-card-header">
                <div class="task-tags">
                    <span class="tag priority-${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                    ${timeDisplay ? `<span class="tag date"><i class="far fa-clock"></i> ${timeDisplay}</span>` : ''}
                    ${dateDisplay ? `<span class="tag date"><i class="far fa-clock"></i> ${dateDisplay}</span>` : ''}
                    <span class="tag ${categoryClass}">${task.subject}</span>
                </div>
                <div class="task-card-menu-container" style="position: relative;">
                    <i class="fas fa-ellipsis-v task-card-menu" data-task-id="${task.id}"></i>
                    <div class="task-card-dropdown" id="menu-${task.id}" style="display: none;">
                        ${!isCompleted ? `
                        <button class="dropdown-item complete-task" data-task-id="${task.id}">
                            <i class="fas fa-check"></i> Completar
                        </button>
                        ` : ''}
                        ${!isInProgress ? `
                        <button class="dropdown-item move-to-in-progress-task" data-task-id="${task.id}">
                            <i class="fas fa-play"></i> Mover a En Progreso
                        </button>
                        ` : ''}
                        <button class="dropdown-item delete-task" data-task-id="${task.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
            <h3 class="task-title">${task.title}</h3>
            <p class="task-description" id="desc-${task.id}">${task.description}</p>
            ${isDescriptionLong ? `<span class="see-more" id="see-more-${task.id}" onclick="window.taskManager.toggleDescription(${task.id})">Ver más</span>` : ''}
            <div class="task-footer">
                <div></div>
                <div class="task-actions">
                    ${isInProgress ? `
                    <button class="task-action complete" onclick="window.taskManager.completeTask(${task.id})" title="Completar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="task-action delete" onclick="window.taskManager.deleteTask(${task.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : `
                    <button class="task-action view" onclick="window.taskManager.viewTask(${task.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="task-action delete" onclick="window.taskManager.deleteTask(${task.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="task-action edit" onclick="window.taskManager.editTask(${task.id})" title="Editar">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    `}
                </div>
            </div>
        `;

        return card;
    }

    toggleDescription(id) {
        const descElement = document.getElementById(`desc-${id}`);
        const seeMoreBtn = document.getElementById(`see-more-${id}`);

        if (descElement.classList.contains('expanded')) {
            descElement.classList.remove('expanded');
            if (seeMoreBtn) seeMoreBtn.textContent = 'Ver más';
        } else {
            descElement.classList.add('expanded');
            if (seeMoreBtn) seeMoreBtn.textContent = 'Ver menos';
        }
    }

    viewTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && this.previewModal) {
            this.populatePreviewModal(task);
            this.previewModal.show();
        }
    }

    populatePreviewModal(task) {
        document.getElementById('previewTaskTitle').textContent = task.title;
        document.getElementById('previewTaskDescription').textContent = task.description;

        const dateObj = new Date(task.date);
        const formattedDate = dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('previewTaskDate').textContent = formattedDate;

        if (task.time) {
            document.getElementById('previewTaskTime').textContent = this.formatTime(task.time);
        } else {
            document.getElementById('previewTaskTime').textContent = 'No especificada';
        }

        document.getElementById('previewTaskSubject').textContent = task.subject;

        const priorityElement = document.getElementById('previewTaskPriority');
        const priorityText = this.getPriorityLabel(task.priority);
        priorityElement.innerHTML = `<span class="badge bg-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}">${priorityText}</span>`;

        const statusElement = document.getElementById('previewTaskStatus');
        const statusText = task.status === 'in-progress' ? 'En Progreso' :
            task.status === 'completed' ? 'Completada' : 'Atrasada';
        const statusClass = task.status === 'completed' ? 'success' :
            task.status === 'in-progress' ? 'primary' : 'danger';
        statusElement.innerHTML = `<span class="badge bg-${statusClass}">${statusText}</span>`;

        const tagsContainer = document.getElementById('previewTaskTags');
        tagsContainer.innerHTML = '';

        const priorityTag = document.createElement('span');
        priorityTag.className = `badge bg-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}`;
        priorityTag.textContent = `Prioridad: ${priorityText}`;
        tagsContainer.appendChild(priorityTag);

        const categoryClass = task.subject.toLowerCase().includes('ux') || task.subject.toLowerCase().includes('design') ? 'category-ux' : 'category-dev';
        const subjectTag = document.createElement('span');
        subjectTag.className = `badge ${categoryClass}`;
        subjectTag.textContent = task.subject;
        tagsContainer.appendChild(subjectTag);
    }

    closePreviewModal() {
        if (this.previewModal) this.previewModal.hide();
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) this.openModal(task);
    }

    updateTaskCounts() {
        const inProgress = this.tasks.filter(t => t.status === 'in-progress').length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const overdue = this.tasks.filter(t => t.status === 'overdue').length;

        document.getElementById('inProgressCount').textContent = `(${inProgress})`;
        document.getElementById('completedCount').textContent = `(${completed})`;
        document.getElementById('overdueCount').textContent = `(${overdue})`;
    }

    async sleep(time) {
        await new Promise(resolve => setTimeout(resolve, time))
    }

    async searchTasks(query) {
        await this.sleep(1200);
        const searchTerm = query.toLowerCase();
        const allCards = document.querySelectorAll('.task-card');

        allCards.forEach(card => {
            const title = card.querySelector('.task-title').textContent.toLowerCase();
            const description = card.querySelector('.task-description').textContent.toLowerCase();

            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    openFilterModal() {
        const priorityFilters = document.querySelectorAll('.priority-filter');
        priorityFilters.forEach(checkbox => checkbox.checked = this.filters.priorities.includes(checkbox.value));

        document.getElementById('subjectFilter').value = this.filters.subject;
        document.getElementById('sortBy').value = this.filters.sortBy;

        if (this.filterModal) this.filterModal.show();
    }

    closeFilterModal() {
        if (this.filterModal) this.filterModal.hide();
    }

    applyFilters() {
        const priorityFilters = document.querySelectorAll('.priority-filter:checked');
        this.filters.priorities = Array.from(priorityFilters).map(cb => cb.value);
        this.filters.subject = document.getElementById('subjectFilter').value;
        this.filters.sortBy = document.getElementById('sortBy').value;

        this.renderTasks();
        if (this.filterModal) this.filterModal.hide();
    }

    clearFilters() {
        this.filters = {
            priorities: [],
            subject: '',
            sortBy: 'date'
        };

        document.querySelectorAll('.priority-filter').forEach(cb => cb.checked = false);
        document.getElementById('subjectFilter').value = '';
        document.getElementById('sortBy').value = 'date';

        this.renderTasks();
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getPriorityLabel(priority) {
        const priorityLabels = {
            'high': 'Alta',
            'medium': 'Media',
            'low': 'Baja'
        };
        return priorityLabels[priority] || this.capitalize(priority);
    }

    formatTime(time) {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    toggleViewMode() {
        this.viewMode = this.viewMode === 'column' ? 'grid' : 'column';
        this.updateViewModeUI();
        this.renderTasks();
    }

    updateViewModeUI() {
        const previewBtn = document.getElementById('previewBtn');
        const taskColumns = document.querySelector('.task-columns');
        let gridContainer = document.getElementById('gridViewContainer');

        if (this.viewMode === 'grid') {
            previewBtn.innerHTML = '<i class="fas fa-columns"></i><span>Vista Columnas</span>';
            previewBtn.classList.add('active');

            if (taskColumns) taskColumns.style.display = 'none';

            if (!gridContainer) {
                const gridDiv = document.createElement('div');
                gridDiv.id = 'gridViewContainer';
                gridDiv.className = 'grid-view-container';
                const taskSection = document.querySelector('.task-section');
                if (taskSection && taskColumns) {
                    taskSection.insertBefore(gridDiv, taskColumns);
                }
            } else {
                gridContainer.style.display = 'grid';
            }
        } else {
            previewBtn.innerHTML = '<i class="fas fa-th"></i><span>Vista Previa</span>';
            previewBtn.classList.remove('active');
            if (taskColumns) taskColumns.style.display = '';
            if (gridContainer) gridContainer.style.display = 'none';
        }
    }

    renderGridView(tasks) {
        const gridContainer = document.getElementById('gridViewContainer');
        if (!gridContainer) {
            this.updateViewModeUI();
            return;
        }

        gridContainer.innerHTML = '';

        if (tasks.length === 0) {
            gridContainer.innerHTML = '<p style="text-align: center; color: #7F8C8D; padding: 40px; grid-column: 1 / -1;">No hay tareas</p>';
            return;
        }

        tasks.forEach(task => {
            const taskCard = this.createTaskCard(task);
            gridContainer.appendChild(taskCard);
            this.attachMenuListeners(taskCard, task.id);
        });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (typeof bootstrap !== 'undefined') {
        window.taskManager = new TaskManager();
    } else {
        setTimeout(() => {
            window.taskManager = new TaskManager();
        }, 100);
    }
});

setInterval(() => {
    if (window.taskManager) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        window.taskManager.tasks.forEach(task => {
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);

            if (task.status === 'in-progress' && taskDate < today) {
                task.status = 'overdue';
            }
        });

        window.taskManager.saveTasks();
        window.taskManager.renderTasks();
        window.taskManager.updateTaskCounts();
    }
}, 60000);

