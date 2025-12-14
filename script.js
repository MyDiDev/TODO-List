class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentEditId = null;
        this.taskToDelete = null;
        this.filters = {
            priorities: [],
            subject: '',
            sortBy: 'date'
        };
        this.init();
    }

    init() {
        this.renderTasks();
        this.setupEventListeners();
        this.updateTaskCounts();
    }

    loadTasks() {
        const stored = localStorage.getItem('tasks');
        if (stored) return JSON.parse(stored);
        return [];
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

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTasks(e.target.value);
        });

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
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskProgressCompleted').value = task.progressCompleted || 0;
            document.getElementById('taskProgressTotal').value = task.progressTotal || 1;
        } else {
            modalTitle.textContent = 'Agregar Nueva Tarea';
            this.currentEditId = null;
            form.reset();
            document.getElementById('taskProgressCompleted').value = 0;
            document.getElementById('taskProgressTotal').value = 1;
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
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            progressCompleted: parseInt(document.getElementById('taskProgressCompleted').value) || 0,
            progressTotal: parseInt(document.getElementById('taskProgressTotal').value) || 1
        };

        if (formData.status !== 'completed') {
            const taskDate = new Date(formData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            taskDate.setHours(0, 0, 0, 0);

            if (taskDate < today) {
                formData.status = 'overdue';
            } else if (formData.status !== 'in-progress') {
                formData.status = 'in-progress';
            }
        }

        if (this.currentEditId) {
            const index = this.tasks.findIndex(t => t.id === this.currentEditId);
            if (index !== -1) {
                this.tasks[index] = { ...this.tasks[index], ...formData };
            }
        } else {
            const newTask = {
                id: this.generateId(),
                ...formData,
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
        if (this.confirmModal) {
            this.confirmModal.show();
        }
    }

    confirmDelete() {
        if (this.taskToDelete !== null) {
            this.tasks = this.tasks.filter(t => t.id !== this.taskToDelete);
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCounts();
            this.taskToDelete = null;
        }
        this.closeConfirmModal();
    }

    closeConfirmModal() {
        if (this.confirmModal) {
            this.confirmModal.hide();
        }
        this.taskToDelete = null;
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

        const inProgress = filteredTasks.filter(t => t.status === 'in-progress');
        const completed = filteredTasks.filter(t => t.status === 'completed');
        const overdue = filteredTasks.filter(t => t.status === 'overdue');

        this.renderTaskList('inProgressList', inProgress);
        this.renderTaskList('completedList', completed);
        this.renderTaskList('overdueList', overdue);
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
        });
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

        card.innerHTML = `
            <div class="task-card-header">
                <div class="task-tags">
                    <span class="tag priority-${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                    ${timeDisplay ? `<span class="tag date"><i class="far fa-clock"></i> ${timeDisplay}</span>` : ''}
                    ${dateDisplay ? `<span class="tag date"><i class="far fa-clock"></i> ${dateDisplay}</span>` : ''}
                    <span class="tag ${categoryClass}">${task.subject}</span>
                </div>
                <i class="fas fa-ellipsis-v task-card-menu"></i>
            </div>
            <h3 class="task-title">${task.title}</h3>
            <p class="task-description" id="desc-${task.id}">${task.description}</p>
            ${isDescriptionLong ? `<span class="see-more" id="see-more-${task.id}" onclick="window.taskManager.toggleDescription(${task.id})">Ver más</span>` : ''}
            <div class="task-footer">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="task-progress">
                        <i class="fas fa-tasks"></i>
                        <span>${task.progressCompleted || 0}/${task.progressTotal || 1}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action view" onclick="window.taskManager.viewTask(${task.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="task-action delete" onclick="window.taskManager.deleteTask(${task.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="task-action edit" onclick="window.taskManager.editTask(${task.id})" title="Edit">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
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

        const progress = task.progressCompleted || 0;
        const total = task.progressTotal || 1;
        document.getElementById('previewTaskProgress').textContent = `${progress} / ${total}`;

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

    searchTasks(query) {
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

