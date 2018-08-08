/* global getValueByLocaleAndType, getJSON, postJSON, putJSON, deleteJSON **/

(() => {
  "use strict";

  /**
   * Class for category management page
   */
  class CategoryManagement {

    /**
     * Constructor. 
     */
    constructor(element, formContainer) {
      this.element = element;
      this.selectedNode = null;
      this.formContainer = formContainer;
      $(document).on("click", "#add-category-button", this.onAddCategoryClick.bind(this));
      $(document).on("click", "#edit-category-button", this.onEditCategoryClick.bind(this));
      $(document).on("click", "#delete-category-button", this.onDeleteCategoryClick.bind(this));
      this.createTree();
      this.renderCategoryForm(null);
    }

    async createTree() {
      const data = await getJSON("/ajax/admin/categories");
      this.element.tree({
        data: data,
        dragAndDrop: true
      });
      this.element.on("tree.select", this.onItemSelectOrDeselect.bind(this));
      this.element.on("tree.move", this.onItemMove.bind(this));
    }

    async onAddCategoryClick(e) {
      await this.addCategory();
    }

    async onEditCategoryClick(e) {
      await this.updateCategory();
    }

    async onDeleteCategoryClick(e) {
      await this.deleteCategory();
    }

    async onItemMove(e) {
      e.preventDefault();
      e.move_info.do_move();
      const movedNode = e.move_info.moved_node;
      const category = movedNode.category;
      if (!movedNode.parent || movedNode.parent.name.length  == 0) {
        category.parentId = null;
      } else {
        category.parentId = movedNode.parent.id;
      }

      const updatedNode = await putJSON("/ajax/admin/categories", category.id, category);
      this.element.tree("updateNode", movedNode, {
        name: updatedNode.slug,
        id: updatedNode.id,
        category: updatedNode
      });
    }

    onItemSelectOrDeselect(e) {
      if (e.node) {
        this.onItemSelect(e, e.node);
      } else {
        this.onItemDeselect(e, e.previous_node);
      }
    }

    onItemSelect(e, node) {
      this.selectedNode = node;
      this.renderCategoryForm();
    }

    onItemDeselect(e, node) {
      this.selectedNode = null;
      this.renderCategoryForm();
    }

    getCategoryMeta(category, key) {
      const meta = category.meta.find(metaObj => metaObj.key == key);
      if (meta) {
        return meta.value;
      }
      return null;
    }

    getCategoryData(updateParent) {
      const titles = [];
      const nameFiSingle = this.formContainer.find("#name-fi-single").val();
      if (nameFiSingle) {
        titles.push({
          language: "fi",
          type: "SINGLE",
          value: nameFiSingle 
        });
      }
      const nameFiPlural = this.formContainer.find("#name-fi-plural").val();
      if (nameFiPlural) {
        titles.push({
          language: "fi",
          type: "PLURAL",
          value: nameFiPlural 
        });
      }
      const nameEnSingle = this.formContainer.find("#name-en-single").val();
      if (nameEnSingle) {
        titles.push({
          language: "en",
          type: "SINGLE",
          value: nameEnSingle 
        });
      }
      const nameEnPlural = this.formContainer.find("#name-en-plural").val();
      if (nameEnPlural) {
        titles.push({
          language: "en",
          type: "PLURAL",
          value: nameEnPlural 
        });
      }
      const metas = [];
      
      const icon = this.formContainer.find("#meta-ui-icon").val();
      const inIndexPage = this.formContainer.find("#meta-ui-index-page").is(":checked");
      const inFooterSide = this.formContainer.find("#meta-ui-footer-side").is(":checked");
      if (icon) {
        metas.push({
          key: "ui-icon",
          value: icon
        });
      }

      if (inIndexPage) {
        metas.push({
          key: "ui-index-page",
          value: inIndexPage
        });
      }

      if (inFooterSide) {
        metas.push({
          key: "ui-footer-side",
          value: inFooterSide
        });
      }

      return {
        parentId: updateParent ? this.selectedNode ? this.selectedNode.id : null : this.selectedNode ? this.selectedNode.category.parentId : null,
        title: titles,
        meta: metas
      };
    }

    async renderCategoryForm() {
      this.formContainer.empty();
      const data = {};
      const category = this.selectedNode ? this.selectedNode.category : null;
      if (category) {
        data.id = category.id;
        data.namefisingle = getValueByLocaleAndType(category.title, "fi", "SINGLE");
        data.namefiplural = getValueByLocaleAndType(category.title, "fi", "PLURAL");
        data.nameensingle = getValueByLocaleAndType(category.title, "en", "SINGLE");
        data.nameenplural = getValueByLocaleAndType(category.title, "en", "PLURAL");
        data.icon = this.getCategoryMeta(category, "ui-icon");
        data.indexpage = this.getCategoryMeta(category, "ui-index-page") == "true";
        data.footerside = this.getCategoryMeta(category, "ui-footer-side") == "true";
        data.hasChildren = this.selectedNode.children.length > 0;
      }
      const categoryFormHtml = await postJSON("/ajax/admin/categoryform", {data: data});
      this.formContainer.append(categoryFormHtml);
    }

    async addCategory() {
      const data = this.getCategoryData(true);
      const res = await postJSON("/ajax/admin/categories", data);
      this.element.tree("appendNode", {
        name: res.slug,
        id: res.id,
        children: []
      }, this.selectedNode);
    }

    async deleteCategory() {
      if (this.selectedNode && this.selectedNode.children.length == 0) {
        const selectedCategoryId = this.selectedNode.id;
        await deleteJSON("/ajax/admin/categories", selectedCategoryId);
        this.element.tree("removeNode", this.selectedNode);
        this.selectedNode = null;
      }
    }

    async updateCategory() {
      if (this.selectedNode) {
        const data = this.getCategoryData();
        const selectedNodeId = this.selectedNode.id;
        const updatedNode = await putJSON("/ajax/admin/categories", selectedNodeId, data);
        this.element.tree("updateNode", this.selectedNode, {
          name: updatedNode.slug,
          id: updatedNode.id,
          category: updatedNode
        });
      }
    }

  }
  
  $(document).ready(() => {
    new CategoryManagement($("#category-tree"), $("#categoryFormContainer"));
  });

})();